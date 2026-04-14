/**
 * notificationService.ts
 *
 * Handles push notifications via FCM (google-services.json).
 *  - Gets a raw FCM device token via getDevicePushTokenAsync
 *  - No EAS projectId / Expo Push API needed
 *  - Backend sends notifications directly via FCM REST API
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from './apiClient';

// Show notifications as banners even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const RETRY_DELAYS_MS = [3_000, 8_000, 20_000, 60_000]; // 4 attempts after first failure

class NotificationService {
  private _subscription: Notifications.Subscription | null = null;
  private _tapSubscription: Notifications.Subscription | null = null;
  private _registered = false;
  private _retryCount = 0;
  private _retryTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Request permission, obtain the FCM device token and register it with
   * the backend.  Safe to call multiple times — skips if already registered.
   *
   * @returns {Promise<boolean>} true if permission was granted and token obtained
   */
  async register(): Promise<boolean> {
    // Notifications temporarily disabled
    return false;

    if (this._registered) return true;

    // Push notifications require a physical device
    if (!Device.isDevice) {
      console.warn('[notificationService] Physical device required for push notifications');
      return false;
    }

    // Request / check permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[notificationService] Push notification permission denied');
      return false;
    }

    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Ovally',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B9D',
        showBadge: true,
      });
    }

    // Get the raw FCM device token — powered by google-services.json
    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      const fcmToken = tokenData.data as string;

      console.log('[notificationService] FCM token obtained');

      // Reset retry state on success
      this._retryCount = 0;
      if (this._retryTimer != null) {
        clearTimeout(this._retryTimer as unknown as number);
        this._retryTimer = null;
      }

      // Register with backend (fire-and-forget — don't block app startup)
      apiClient.registerPushToken(fcmToken).catch((e) =>
        console.warn('[notificationService] Failed to register token with backend:', e?.message)
      );

      this._setupListeners();
      this._registered = true;
      return true;
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      const isTransient =
        msg.includes('SERVICE_NOT_AVAILABLE') ||
        msg.includes('NETWORK_ERROR') ||
        msg.includes('TOO_MANY_REGISTRATIONS');

      if (isTransient && this._retryCount < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[this._retryCount];
        this._retryCount += 1;
        console.warn(
          `[notificationService] FCM token fetch failed (${msg}), retrying in ${delay / 1000}s (attempt ${this._retryCount}/${RETRY_DELAYS_MS.length})`
        );
        this._retryTimer = setTimeout(() => this.register(), delay);
      } else {
        console.warn('[notificationService] Failed to get FCM token:', msg, '— notifications disabled');
      }
      return false;
    }
  }

  /**
   * Returns true if push notification permission is currently granted.
   */
  async hasPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Sets up foreground notification and tap handlers.
   * Cleans up any previous subscriptions first.
   */
  private _setupListeners() {
    this._subscription?.remove();
    this._tapSubscription?.remove();

    // Foreground notification received
    this._subscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[notificationService] Notification received in foreground:', notification.request.content);
    });

    // User tapped a notification
    this._tapSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any>;
      console.log('[notificationService] Notification tapped:', data);
    });
  }

  /** Remove all active subscriptions (call on logout) */
  cleanup() {
    this._subscription?.remove();
    this._tapSubscription?.remove();
    this._subscription = null;
    this._tapSubscription = null;
    this._registered = false;
    this._retryCount = 0;
    if (this._retryTimer != null) {
      clearTimeout(this._retryTimer as unknown as number);
      this._retryTimer = null;
    }
  }
}

export const notificationService = new NotificationService();
