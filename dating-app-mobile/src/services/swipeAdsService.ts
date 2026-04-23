type AdEventHandler = (...args: unknown[]) => void;

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './apiClient';

type InterstitialAdLike = {
  load: () => void;
  show: () => Promise<void> | void;
  addAdEventListener: (eventType: string, listener: AdEventHandler) => () => void;
};

type MobileAdsModule = {
  TestIds: {
    INTERSTITIAL: string;
  };
  InterstitialAd: {
    createForAdRequest: (adUnitId: string, options?: Record<string, unknown>) => InterstitialAdLike;
  };
  AdEventType: {
    LOADED: string;
    CLOSED: string;
    ERROR: string;
    OPENED?: string;
    CLICKED?: string;
  };
};

const mobileAdsModule: MobileAdsModule | null = (() => {
  try {
    return require('react-native-google-mobile-ads') as MobileAdsModule;
  } catch {
    return null;
  }
})();

class SwipeAdsService {
  private isShowing = false;
  private swipeCount = 0;
  private config = {
    enabled: true,
    placement: 'discovery_interstitial',
    everyNSwipes: 8,
    dailyCap: 15,
  };

  setConfig(config: Partial<{ enabled: boolean; placement: string; everyNSwipes: number; dailyCap: number }>) {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  async syncConfigFromBackend() {
    try {
      const response = await apiClient.getAdsConfig();
      const cfg = response?.discoveryInterstitial;
      if (cfg) {
        this.setConfig(cfg);
      }
    } catch {
      // non-critical, keep defaults
    }
  }

  private dailyCapKey() {
    const today = new Date().toISOString().slice(0, 10);
    return `ad:discovery:shows:${today}`;
  }

  private async getDailyShownCount() {
    const val = await AsyncStorage.getItem(this.dailyCapKey());
    return Number.parseInt(val || '0', 10) || 0;
  }

  private async incrementDailyShownCount() {
    const count = await this.getDailyShownCount();
    await AsyncStorage.setItem(this.dailyCapKey(), String(count + 1));
  }

  async shouldShowAfterSwipe(): Promise<boolean> {
    if (!this.config.enabled) return false;

    this.swipeCount += 1;
    if (this.swipeCount % Math.max(1, this.config.everyNSwipes) !== 0) {
      return false;
    }

    const shownToday = await this.getDailyShownCount();
    return shownToday < Math.max(1, this.config.dailyCap);
  }

  private async trackEvent(eventType: 'impression' | 'click' | 'close' | 'load_failed', metadata?: Record<string, unknown>) {
    try {
      await apiClient.trackAdEvent({
        eventType,
        placement: this.config.placement,
        metadata,
      });
    } catch {
      // non-critical telemetry failure
    }
  }

  private getAdUnitId(): string | null {
    if (!mobileAdsModule) return null;

    if (__DEV__) {
      return mobileAdsModule.TestIds.INTERSTITIAL;
    }

    const prodAdUnitId = process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID;
    return prodAdUnitId || null;
  }

  async showInterstitial(): Promise<boolean> {
    if (this.isShowing || !mobileAdsModule || !this.config.enabled) {
      return false;
    }

    const adUnitId = this.getAdUnitId();
    if (!adUnitId) {
      console.warn('[swipeAdsService] Missing EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID');
      return false;
    }

    this.isShowing = true;

    return new Promise<boolean>((resolve) => {
      const interstitial = mobileAdsModule.InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      let settled = false;
      let unsubscribeLoaded: () => void = () => {};
      let unsubscribeClosed: () => void = () => {};
      let unsubscribeError: () => void = () => {};
      let unsubscribeOpened: () => void = () => {};
      let unsubscribeClicked: () => void = () => {};

      const cleanupAndResolve = (value: boolean) => {
        if (settled) return;
        settled = true;
        unsubscribeLoaded();
        unsubscribeClosed();
        unsubscribeError();
        unsubscribeOpened();
        unsubscribeClicked();
        this.isShowing = false;
        resolve(value);
      };

      unsubscribeLoaded = interstitial.addAdEventListener(
        mobileAdsModule.AdEventType.LOADED,
        () => {
          try {
            void interstitial.show();
            void this.trackEvent('impression');
          } catch (error) {
            console.warn('[swipeAdsService] Failed to show interstitial:', error);
            void this.trackEvent('load_failed', { stage: 'show', message: String(error) });
            cleanupAndResolve(false);
          }
        }
      );

      const openedType = mobileAdsModule.AdEventType.OPENED;
      const clickedType = mobileAdsModule.AdEventType.CLICKED;
      unsubscribeOpened = openedType
        ? interstitial.addAdEventListener(openedType, () => void this.trackEvent('impression'))
        : () => {};
      unsubscribeClicked = clickedType
        ? interstitial.addAdEventListener(clickedType, () => void this.trackEvent('click'))
        : () => {};

      unsubscribeClosed = interstitial.addAdEventListener(
        mobileAdsModule.AdEventType.CLOSED,
        () => {
          void this.trackEvent('close');
          void this.incrementDailyShownCount();
          cleanupAndResolve(true);
        }
      );

      unsubscribeError = interstitial.addAdEventListener(
        mobileAdsModule.AdEventType.ERROR,
        (error) => {
          console.warn('[swipeAdsService] Interstitial load error:', error);
          void this.trackEvent('load_failed', { stage: 'load', message: String(error) });
          cleanupAndResolve(false);
        }
      );

      interstitial.load();
    });
  }
}

export const swipeAdsService = new SwipeAdsService();
