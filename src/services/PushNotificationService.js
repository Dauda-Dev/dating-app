/**
 * PushNotificationService
 *
 * Sends push notifications via Firebase Admin SDK (FCM HTTP v1 API).
 * Requires a service account JSON file.
 *
 * Setup:
 *   1. Firebase Console → Project Settings → Service accounts
 *   2. Click "Generate new private key" → save as firebase-service-account.json
 *      in the project root (same folder as package.json)
 *   3. Set FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json in .env
 *      OR set GOOGLE_APPLICATION_CREDENTIALS to the same path
 *
 * Falls back to FCM Legacy HTTP API if FCM_SERVER_KEY is set and Admin SDK
 * is not configured.
 */

const path = require('path');
const fs = require('fs');

let _adminApp = null;
let _messaging = null;

function getAdminMessaging() {
  if (_messaging) return _messaging;

  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(process.cwd(), 'firebase-service-account.json');

  if (!fs.existsSync(serviceAccountPath)) {
    return null;
  }

  try {
    const admin = require('firebase-admin');
    if (!_adminApp) {
      const serviceAccount = require(path.resolve(serviceAccountPath));
      _adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[PushNotificationService] Firebase Admin SDK initialized');
    }
    _messaging = admin.messaging(_adminApp);
    return _messaging;
  } catch (err) {
    console.error('[PushNotificationService] Failed to init Firebase Admin SDK:', err.message);
    return null;
  }
}

/**
 * Send via Firebase Admin SDK (FCM v1 API) — preferred method.
 */
async function sendPushAdmin(messaging, to, title, body, data = {}) {
  const stringData = {};
  for (const [k, v] of Object.entries(data)) {
    stringData[k] = String(v);
  }

  const message = {
    token: to,
    notification: { title, body },
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        defaultSound: true,
        defaultVibrateTimings: true,
      },
    },
    data: stringData,
  };

  const result = await messaging.send(message);
  console.log('[PushNotificationService] Sent via Admin SDK:', result);
  return result;
}

/**
 * Send via FCM Legacy HTTP API — fallback if Admin SDK not configured.
 */
async function sendPushLegacy(to, title, body, data = {}) {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    console.warn('[PushNotificationService] No FCM_SERVER_KEY — skipping push');
    return null;
  }

  const message = {
    to,
    notification: { title, body, sound: 'default' },
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

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${serverKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  const result = await response.json();
  if (result?.failure > 0) {
    console.error('[PushNotificationService] FCM legacy delivery error:', result.results);
  }
  return result;
}

/**
 * Send a single push notification.
 *
 * @param {string} to         - Raw FCM device token
 * @param {string} title      - Notification title
 * @param {string} body       - Notification body
 * @param {object} [data={}]  - Optional key-value payload (values must be strings)
 * @returns {Promise<any|null>}
 */
async function sendPush(to, title, body, data = {}) {
  if (!to) {
    console.warn('[PushNotificationService] Skipped — no FCM token provided');
    return null;
  }

  try {
    const messaging = getAdminMessaging();
    if (messaging) {
      return await sendPushAdmin(messaging, to, title, body, data);
    }
    // Fallback to legacy
    return await sendPushLegacy(to, title, body, data);
  } catch (err) {
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
