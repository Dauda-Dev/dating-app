const VideoService = require('../services/VideoService');
const db = require('../config/database');
const NotificationDispatchService = require('../services/NotificationDispatchService');
const { createError } = require('../utils/helpers');

module.exports = {
  async initialize(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      if (!userId) throw createError('Not authenticated', 401);

      const { matchId } = req.body;
      if (!matchId) throw createError('matchId required', 400);

      const result = await VideoService.initializeVideoSession(matchId, userId);

      try {
        const match = await db.Match.findByPk(matchId, { attributes: ['user1Id', 'user2Id'] });
        if (match) {
          const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
          await NotificationDispatchService.sendToUser({
            userId: otherUserId,
            type: 'video_reminder',
            title: 'Video call ready 📹',
            body: 'Your match started a video session. Join now!',
            data: { matchId, sessionId: result.sessionId },
          });
        }
      } catch (notifyErr) {
        console.warn('[videoController] video reminder notification failed:', notifyErr.message);
      }

      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async complete(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      if (!userId) throw createError('Not authenticated', 401);

      const { sessionId } = req.params;
      const { durationSeconds } = req.body;
      
      if (!sessionId) throw createError('sessionId required', 400);
      if (!durationSeconds || durationSeconds < 1) throw createError('durationSeconds required and must be positive', 400);

      const result = await VideoService.completeVideoSession(sessionId, parseInt(durationSeconds, 10));
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getSession(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      if (!userId) throw createError('Not authenticated', 401);

      const { sessionId } = req.params;
      if (!sessionId) throw createError('sessionId required', 400);

      const session = await VideoService.getVideoSession(sessionId);
      if (!session) throw createError('Session not found', 404);

      // Verify user is part of this match
      const match = session.match;
      if (match.user1Id !== userId && match.user2Id !== userId) {
        throw createError('Unauthorized to view this session', 403);
      }

      // Return the correct token for the requesting user
      const userToken = match.user1Id === userId
        ? session.dailyRoomTokenUser1
        : session.dailyRoomTokenUser2;

      return res.json({
        session: {
          ...session.toJSON(),
          userToken, // omit raw token fields, expose only the caller's token
          dailyRoomTokenUser1: undefined,
          dailyRoomTokenUser2: undefined,
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async webhook(req, res, next) {
    try {
      // Daily.co sends webhook events here
      const event = req.body;

      // Optional: Verify webhook signature
      const signature = req.headers['x-daily-signature'];
      // TODO: Implement signature verification if Daily.co provides signing secret

      // Process event
      const result = await VideoService.handleDailyWebhook(event);
      
      return res.json(result);
    } catch (err) {
      console.error('Webhook processing error:', err);
      // Return 200 anyway to acknowledge receipt
      return res.json({ success: false, error: err.message });
    }
  }
};
