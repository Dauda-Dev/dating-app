const MatchService = require('../services/MatchService');

module.exports = {
  async list(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const { limit = 10, offset = 0 } = req.query;
      const result = await MatchService.getUserMatches(userId, parseInt(limit, 10), parseInt(offset, 10));
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async current(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const match = await MatchService.getActiveMatch(userId);
      return res.json({ match });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const match = await MatchService.getMatchById(id);
      if (!match) return res.status(404).json({ error: 'Match not found' });
      return res.json({ match });
    } catch (err) {
      next(err);
    }
  },

  async reject(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const { matchId } = req.body;
      if (!matchId) return res.status(400).json({ error: 'matchId is required' });
      const result = await MatchService.rejectMatch(userId, matchId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async unmatch(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const { id } = req.params;

      const match = await MatchService.getMatchById(id);
      if (!match) return res.status(404).json({ error: 'Match not found' });

      // Only a participant can unmatch
      if (match.user1Id !== userId && match.user2Id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await match.update({ status: 'broken', brokenAt: new Date(), brokenReason: 'user_unmatched' });

      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
};
