/**
 * PushNotificationService
 *
 * Sends push notifications directly via the FCM Legacy HTTP API.
 * Requires FCM_SERVER_KEY in environment variables.
 *
 * Get your Server Key from:
 *   Firebase Console → Project Settings → Cloud Messaging → Server key
 *
 * Usage:
 *   const PushNotificationService = require('./PushNotificationService');
 *   await PushNotificationService.sendPush(fcmToken, title, body, data);
 */

const FCM_URL = 'https://fcm.googleapis.com/fcm/send';

/**
 * Send a single push notification via FCM.
 *
 * @param {string} to         - Raw FCM device token
 * @param {string} title      - Notification title
 * @param {string} body       - Notification body
 * @param {object} [data={}]  - Optional payload delivered to the app
 * @returns {Promise<object|null>}
 */
async function sendPush(to, title, body, data = {}) {
  if (!to) {
    console.warn('[PushNotificationService] Skipped — no FCM token provided');
    return null;
  }

  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    console.warn('[PushNotificationService] FCM_SERVER_KEY not set — skipping push');
    return null;
  }

  const message = {
    to,
    notification: {
      title,
      body,
      sound: 'default',
    },
    data,
    priority: 'high',
    android: {
      notification: {
        channel_id: 'default',
        default_sound: true,
        default_vibrate_timings: true,
      },
    },
  };

  try {
    const response = await fetch(FCM_URL, {
      method: 'POST',
      headers: {
        Authorization: `key=${serverKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    if (result?.failure > 0) {
      console.error('[PushNotificationService] FCM delivery error:', result.results);
    }

    return result;
  } catch (err) {
    // Never throw — push failures should never break the main request flow
    console.error('[PushNotificationService] Failed to send push:', err.message);
    return null;
  }
}

/**
 * Send push notifications to multiple FCM tokens.
 *
 * @param {Array<{to, title, body, data}>} messages
 * @returns {Promise<void>}
 */
async function sendBatchPush(messages) {
  if (!messages || messages.length === 0) return;
  // FCM legacy API doesn't support multi-recipient batching — fire in parallel
  await Promise.allSettled(
    messages.map((m) => sendPush(m.to, m.title, m.body, m.data || {}))
  );
}

module.exports = { sendPush, sendBatchPush };
