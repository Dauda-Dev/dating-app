const db = require('../config/database');

const DEFAULTS = {
  pushEnabled: true,
  matchAlerts: true,
  superLikeAlerts: true,
  stealRequestAlerts: true,
  dateAlerts: true,
  chatAlerts: true,
  videoAlerts: true,
  quietHoursStart: null,
  quietHoursEnd: null,
  timezone: null,
};

class NotificationPreferenceService {
  async getOrCreate(userId) {
    const [prefs] = await db.NotificationPreference.findOrCreate({
      where: { userId },
      defaults: { userId, ...DEFAULTS },
    });

    return prefs;
  }

  async update(userId, updates) {
    const prefs = await this.getOrCreate(userId);
    await prefs.update(updates);
    return prefs;
  }

  mapEventTypeToPrefKey(type) {
    switch (type) {
      case 'match':
        return 'matchAlerts';
      case 'super_like':
        return 'superLikeAlerts';
      case 'steal_request':
        return 'stealRequestAlerts';
      case 'date_proposal':
      case 'date_reminder':
        return 'dateAlerts';
      case 'chat_message':
        return 'chatAlerts';
      case 'video_reminder':
        return 'videoAlerts';
      default:
        return null;
    }
  }

  async canSendPush(userId, type) {
    const prefs = await this.getOrCreate(userId);
    if (!prefs.pushEnabled) return false;

    const prefKey = this.mapEventTypeToPrefKey(type);
    if (prefKey && prefs[prefKey] === false) return false;

    return true;
  }
}

module.exports = new NotificationPreferenceService();
