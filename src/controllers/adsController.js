const AdService = require('../services/AdService');

module.exports = {
  async getConfig(req, res, next) {
    try {
      const userTier = req.user?.subscriptionTier || req.userTier || 'free';
      const discovery = AdService.getDiscoveryInterstitialConfig();

      return res.json({
        discoveryInterstitial: {
          ...discovery,
          enabled: discovery.enabled && userTier === 'free',
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async trackEvent(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const { eventType, placement, metadata } = req.body;
      if (!eventType) return res.status(400).json({ error: 'eventType is required' });

      const event = await AdService.trackEvent({ userId, eventType, placement, metadata });
      return res.status(201).json({ success: true, eventId: event.id });
    } catch (err) {
      next(err);
    }
  },
};
