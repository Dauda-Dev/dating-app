const StealService = require('../services/StealService');
const EmailService = require('../services/EmailService');
const db = require('../config/database');

module.exports = {
  async createRequest(req, res, next) {
    try {
      const requesterId = req.userId || req.user?.userId;
      const { targetUserId } = req.body;
      if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });

      const request = await StealService.createStealRequest(requesterId, targetUserId);
      
      // Send notification email to target
      try {
        const requester = await db.User.findByPk(requesterId);
        const target = await db.User.findByPk(targetUserId);
        
        if (target && target.email && requester) {
          await EmailService.sendStealNotification(target.email, requester.firstName);
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
  }
};
