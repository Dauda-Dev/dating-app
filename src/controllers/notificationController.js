const NotificationPreferenceService = require('../services/NotificationPreferenceService');

module.exports = {
  async getPreferences(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const prefs = await NotificationPreferenceService.getOrCreate(userId);
      return res.json({ preferences: prefs });
    } catch (err) {
      next(err);
    }
  },

  async updatePreferences(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const allowedKeys = [
        'pushEnabled',
        'matchAlerts',
        'superLikeAlerts',
        'stealRequestAlerts',
        'dateAlerts',
        'chatAlerts',
        'videoAlerts',
        'quietHoursStart',
        'quietHoursEnd',
        'timezone',
      ];

      const updates = {};
      for (const key of allowedKeys) {
        if (Object.prototype.hasOwnProperty.call(req.body, key)) {
          updates[key] = req.body[key];
        }
      }

      const prefs = await NotificationPreferenceService.update(userId, updates);
      return res.json({ success: true, preferences: prefs });
    } catch (err) {
      next(err);
    }
  },
};
