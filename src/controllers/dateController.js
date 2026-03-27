const DateService = require('../services/DateService');
const EmailService = require('../services/EmailService');
const db = require('../config/database');

module.exports = {
  async propose(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const { matchId, location, proposedDate: rawDate, venue, message } = req.body;
      if (!matchId || !location || !rawDate) return res.status(400).json({ error: 'matchId, location and proposedDate required' });

      // Normalise "YYYY-MM-DD HH:MM" → "YYYY-MM-DDTHH:MM" so Date.parse works correctly
      const proposedDate = String(rawDate).replace(' ', 'T');
      if (isNaN(Date.parse(proposedDate))) return res.status(400).json({ error: 'Invalid date/time format. Use YYYY-MM-DD HH:MM' });

      const result = await DateService.proposeDateDetails(matchId, userId, location, proposedDate, venue, message);
      
      // Send email to matched user
      try {
        const match = await db.Match.findByPk(matchId, {
          include: [
            { model: db.User, as: 'User1' },
            { model: db.User, as: 'User2' }
          ]
        });

        if (match) {
          const otherUser = match.user1Id === userId ? match.User2 : match.User1;
          const proposingUser = match.user1Id === userId ? match.User1 : match.User2;
          
          if (otherUser && otherUser.email) {
            await EmailService.sendDateProposal(otherUser.email, proposingUser.firstName, location, proposedDateTime);
          }
        }
      } catch (emailErr) {
        console.error('Error sending date proposal email:', emailErr);
      }

      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async accept(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const { matchId } = req.body;
      if (!matchId) return res.status(400).json({ error: 'matchId required' });

      const result = await DateService.acceptDateProposal(matchId, userId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async complete(req, res, next) {
    try {
      const { matchId } = req.body;
      if (!matchId) return res.status(400).json({ error: 'matchId required' });

      const result = await DateService.completeDateAndOpenForStealing(matchId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
};
