const db = require('../config/database');

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

class AdService {
  getDiscoveryInterstitialConfig() {
    const enabled = (process.env.AD_SWIPE_INTERSTITIAL_ENABLED || 'true').toLowerCase() === 'true';
    const everyNSwipes = parsePositiveInt(process.env.AD_SWIPE_INTERSTITIAL_EVERY_N, 8);
    const dailyCap = parsePositiveInt(process.env.AD_SWIPE_INTERSTITIAL_DAILY_CAP, 15);

    return {
      enabled,
      placement: 'discovery_interstitial',
      everyNSwipes,
      dailyCap,
    };
  }

  async trackEvent({ userId, eventType, placement = 'discovery_interstitial', metadata = null }) {
    if (!['impression', 'click', 'close', 'load_failed'].includes(eventType)) {
      throw new Error('Invalid ad event type');
    }

    const record = await db.AdEvent.create({
      userId: userId || null,
      eventType,
      placement,
      metadata,
    });

    return record;
  }
}

module.exports = new AdService();
