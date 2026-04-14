const db = require('../config/database');
const { Op } = require('sequelize');
const PushNotificationService = require('../services/PushNotificationService');

const CHAT_STATUSES = ['video_call_completed', 'date_accepted', 'post_date_open'];
const PAGE_LIMIT = 30;

/**
 * GET /api/chat/:matchId/messages?before=<isoDate>&limit=<n>
 * Load message history (cursor-based, newest first for pagination)
 */
async function getMessages(req, res) {
  try {
    const { matchId } = req.params;
    const { before, limit } = req.query;
    const userId = req.userId;

    const match = await db.Match.findOne({
      where: { id: matchId, status: CHAT_STATUSES },
    });
    if (!match) return res.status(404).json({ error: 'Chat not available for this match' });
    if (match.user1Id !== userId && match.user2Id !== userId) {
      return res.status(403).json({ error: 'Not a participant of this match' });
    }

    const pageLimit = Math.min(parseInt(limit, 10) || PAGE_LIMIT, 100);
    const where = { matchId };
    if (before) where.created_at = { [Op.lt]: new Date(before) };

    const messages = await db.Message.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: pageLimit,
      include: [{
        model: db.User,
        as: 'sender',
        attributes: ['id', 'firstName', 'lastName', 'profilePhoto'],
      }],
    });

    // Mark unread messages (sent by the other user) as read
    await db.Message.update(
      { readAt: new Date() },
      {
        where: {
          matchId,
          senderId: { [Op.ne]: userId },
          readAt: null,
        },
      }
    );

    // Notify the other user via socket that messages were read
    const io = req.app.get('io');
    if (io) {
      io.to(`match:${matchId}`).emit('messages_read', { matchId, readAt: new Date() });
    }

    return res.json({
      messages: messages.reverse(), // return oldest-first for rendering
      hasMore: messages.length === pageLimit,
    });
  } catch (err) {
    console.error('[chatController] getMessages error:', err);
    return res.status(500).json({ error: 'Failed to load messages' });
  }
}

/**
 * GET /api/chat/unread-counts
 * Returns unread message counts keyed by matchId for the current user.
 */
async function getUnreadCounts(req, res) {
  try {
    const userId = req.userId;

    const counts = await db.Message.findAll({
      attributes: [
        'matchId',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('Message.id')), 'unreadCount'],
      ],
      where: {
        senderId: { [Op.ne]: userId },
        readAt: null,
      },
      include: [{
        model: db.Match,
        as: 'match',
        attributes: [],
        where: {
          status: CHAT_STATUSES,
          [Op.or]: [{ user1Id: userId }, { user2Id: userId }],
        },
        required: true,
      }],
      group: ['Message.match_id'],
      raw: true,
    });

    const result = {};
    counts.forEach((row) => {
      result[row.matchId] = parseInt(row.unreadCount, 10);
    });

    return res.json({ unreadCounts: result });
  } catch (err) {
    console.error('[chatController] getUnreadCounts error:', err);
    return res.status(500).json({ error: 'Failed to load unread counts' });
  }
}

module.exports = { getMessages, getUnreadCounts };
