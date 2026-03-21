const DiscoveryService = require('../services/DiscoveryService');
const MatchService = require('../services/MatchService');
const EmailService = require('../services/EmailService');

module.exports = {
  async eligibleUsers(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const { limit = 20, offset = 0 } = req.query;
      const users = await DiscoveryService.getEligibleUsers(userId, parseInt(limit, 10), parseInt(offset, 10));
      return res.json({ users });
    } catch (err) {
      next(err);
    }
  },

  async like(req, res, next) {
    try {
      const fromUserId = req.userId || req.user?.userId;
      const { toUserId, userId: bodyUserId, likeType = 'like' } = req.body;
      const targetUserId = toUserId || bodyUserId;
      if (!targetUserId) return res.status(400).json({ error: 'toUserId is required' });

      const result = await MatchService.processLikeAndCreateMatch(fromUserId, targetUserId, likeType);
      
      // Send email notifications on match
      if (result.matched) {
        try {
          const fromUser = await MatchService.getMatchById(result.match.id);
          if (fromUser) {
            const toUser = fromUser.user1Id === fromUserId ? fromUser.User2 : fromUser.User1;
            const matchedUser = fromUser.user1Id === fromUserId ? fromUser.User2 : fromUser.User1;
            
            if (toUser && toUser.email) {
              await EmailService.sendMatchNotification(toUser.email, matchedUser.firstName);
            }
          }
        } catch (emailErr) {
          console.error('Error sending match notification:', emailErr);
        }
      }
      
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getUserCard(req, res, next) {
    try {
      const { id } = req.params;
      const userCard = await DiscoveryService.getUserCard(id);
      if (!userCard) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: userCard });
    } catch (err) {
      next(err);
    }
  }
};
