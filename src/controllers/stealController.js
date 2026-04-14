const StealService = require('../services/StealService');
const EmailService = require('../services/EmailService');
const PushNotificationService = require('../services/PushNotificationService');
const db = require('../config/database');

module.exports = {
  async createRequest(req, res, next) {
    try {
      const requesterId = req.userId || req.user?.userId;
      const { targetUserId } = req.body;
      if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });

      const request = await StealService.createStealRequest(requesterId, targetUserId);
      
      // Send email + push notification to target
      try {
        const requester = await db.User.findByPk(requesterId);
        const target = await db.User.findByPk(targetUserId);

        if (target && target.email && requester) {
          await EmailService.sendStealNotification(target.email, requester.firstName);
        }
        if (target?.pushToken) {
          await PushNotificationService.sendPush(
            target.pushToken,
            'Someone wants to steal you! 💘',
            `${requester?.firstName || 'Someone'} sent you a steal request on Ovally.`,
            { type: 'steal_request', requesterId }
          );
        }
      } catch (emailErr) {
        console.error('Error sending steal notification:', emailErr);
      }

      return res.status(201).json({ request });
    } catch (err) {
      next(err);
    }
  },

  async acceptRequest(req, res, next) {
    try {
      const acceptingUserId = req.userId || req.user?.userId;
      const { id } = req.params;

      const result = await StealService.acceptStealRequest(id, acceptingUserId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async rejectRequest(req, res, next) {
    try {
      const rejectingUserId = req.userId || req.user?.userId;
      const { id } = req.params;

      const result = await StealService.rejectStealRequest(id, rejectingUserId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async pending(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const requests = await StealService.getPendingStealRequests(userId);
      return res.json({ requests });
    } catch (err) {
      next(err);
    }
  },

  async sent(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const requests = await StealService.getSentStealRequests(userId);
      return res.json({ requests });
    } catch (err) {
      next(err);
    }
  },

  async cancelRequest(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const { id } = req.params;
      const stealRequest = await require('../config/database').StealRequest.findByPk(id);
      if (!stealRequest) return res.status(404).json({ error: 'Steal request not found' });
      if (stealRequest.requesterId !== userId) return res.status(403).json({ error: 'Not your request' });
      if (stealRequest.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });
      await stealRequest.update({ status: 'rejected', respondedAt: new Date() });
      return res.json({ success: true, message: 'Steal request cancelled' });
    } catch (err) {
      next(err);
    }
  }
};
