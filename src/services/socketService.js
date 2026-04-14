const jwt = require('jsonwebtoken');
const db = require('../config/database');
const PushNotificationService = require('./PushNotificationService');

/**
 * Returns the list of Socket.io room names a user belongs to
 * based on their active matches.
 */
async function getUserMatchRooms(userId) {
  const matches = await db.Match.findAll({
    where: {
      status: ['video_call_completed', 'date_accepted', 'post_date_open'],
    },
    attributes: ['id', 'user1Id', 'user2Id'],
  });
  return matches
    .filter((m) => m.user1Id === userId || m.user2Id === userId)
    .map((m) => `match:${m.id}`);
}

/**
 * Initialise Socket.io on the provided http.Server and return the io instance.
 */
function initSocketService(httpServer) {
  const { Server } = require('socket.io');

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ── JWT Authentication middleware ────────────────────────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const { userId } = socket;

    // Auto-join all active match rooms for this user
    try {
      const rooms = await getUserMatchRooms(userId);
      rooms.forEach((room) => socket.join(room));
    } catch (err) {
      console.error('[socket] Failed to auto-join rooms:', err.message);
    }

    // ── join_room ──────────────────────────────────────────────────────────
    // Client calls this when opening a chat screen to explicitly join a room
    socket.on('join_room', async ({ matchId }) => {
      try {
        const match = await db.Match.findOne({
          where: {
            id: matchId,
            status: ['video_call_completed', 'date_accepted', 'post_date_open'],
          },
        });
        if (!match) return socket.emit('error', { message: 'Chat not available for this match' });
        if (match.user1Id !== userId && match.user2Id !== userId) {
          return socket.emit('error', { message: 'Not a participant of this match' });
        }
        socket.join(`match:${matchId}`);
        socket.emit('joined_room', { matchId });
      } catch (err) {
        console.error('[socket] join_room error:', err.message);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // ── send_message ───────────────────────────────────────────────────────
    socket.on('send_message', async ({ matchId, content }) => {
      try {
        if (!content || content.trim().length === 0) {
          return socket.emit('error', { message: 'Message cannot be empty' });
        }
        if (content.length > 2000) {
          return socket.emit('error', { message: 'Message too long (max 2000 characters)' });
        }

        // Verify match exists and is chateable, and user is a participant
        const match = await db.Match.findOne({
          where: {
            id: matchId,
            status: ['video_call_completed', 'date_accepted', 'post_date_open'],
          },
        });
        if (!match) return socket.emit('error', { message: 'Chat not available for this match' });
        if (match.user1Id !== userId && match.user2Id !== userId) {
          return socket.emit('error', { message: 'Not a participant of this match' });
        }

        const message = await db.Message.create({
          matchId,
          senderId: userId,
          content: content.trim(),
        });

        const payload = {
          id: message.id,
          matchId,
          senderId: userId,
          content: message.content,
          readAt: null,
          createdAt: message.created_at,
        };

        // Deliver to all sockets in the match room (both users)
        io.to(`match:${matchId}`).emit('new_message', payload);

        // Send push notification to the OTHER user if they're not in the room
        // (i.e. app is backgrounded or closed)
        try {
          const recipientId = match.user1Id === userId ? match.user2Id : match.user1Id;
          const room = io.sockets.adapter.rooms.get(`match:${matchId}`);
          // Check if any socket belonging to recipient is in the room
          const recipientSockets = await io.in(`match:${matchId}`).fetchSockets();
          const recipientOnline = recipientSockets.some((s) => s.userId === recipientId);

          if (!recipientOnline) {
            const recipient = await db.User.findByPk(recipientId, {
              attributes: ['pushToken', 'firstName'],
            });
            const sender = await db.User.findByPk(userId, { attributes: ['firstName'] });

            if (recipient?.pushToken) {
              await PushNotificationService.sendPush(
                recipient.pushToken,
                sender?.firstName || 'New message',
                content.trim().slice(0, 100),
                { type: 'new_message', matchId: String(matchId) }
              );
            }
          }
        } catch (pushErr) {
          console.warn('[socket] Push notification failed for new message:', pushErr.message);
        }
      } catch (err) {
        console.error('[socket] send_message error:', err.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── typing ─────────────────────────────────────────────────────────────
    socket.on('typing', ({ matchId, isTyping }) => {
      socket.to(`match:${matchId}`).emit('user_typing', { userId, isTyping });
    });

    // ── mark_read ──────────────────────────────────────────────────────────
    socket.on('mark_read', async ({ matchId }) => {
      try {
        const now = new Date();
        await db.Message.update(
          { readAt: now },
          {
            where: {
              matchId,
              senderId: { [db.Sequelize.Op.ne]: userId },
              readAt: null,
            },
          }
        );
        // Notify sender that their messages were read
        socket.to(`match:${matchId}`).emit('messages_read', { matchId, readAt: now });
      } catch (err) {
        console.error('[socket] mark_read error:', err.message);
      }
    });

    // ── disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      // Nothing special needed — socket.io auto-cleans room memberships
    });
  });

  return io;
}

module.exports = { initSocketService };
