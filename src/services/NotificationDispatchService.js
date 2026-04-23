const db = require('../config/database');
const PushNotificationService = require('./PushNotificationService');
const NotificationPreferenceService = require('./NotificationPreferenceService');

class NotificationDispatchService {
  async sendToUser({ userId, type, title, body, data = {} }) {
    if (!userId) return { sent: false, reason: 'missing_user' };

    const allowed = await NotificationPreferenceService.canSendPush(userId, type);
    if (!allowed) {
      return { sent: false, reason: 'preference_disabled' };
    }

    const user = await db.User.findByPk(userId, { attributes: ['id', 'pushToken'] });
    if (!user?.pushToken) {
      return { sent: false, reason: 'no_push_token' };
    }

    await PushNotificationService.sendPush(
      user.pushToken,
      title,
      body,
      { ...data, type }
    );

    return { sent: true };
  }
}

module.exports = new NotificationDispatchService();
