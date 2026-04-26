const PaymentService = require('../services/PaymentService');
const crypto = require('crypto');

module.exports = {
  /**
   * GET /api/payments/plans
   * Returns available subscription tiers and their features/prices
   */
  async getPlans(req, res, next) {
    try {
      const plans = PaymentService.getPlanInfo();
      return res.json(plans);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/payments/initialize
   * Body: { tier: 'premium' | 'gold' }
   * Returns Paystack authorization URL for redirect/WebView
   */
  async initializePayment(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const { tier } = req.body;

      if (!tier) return res.status(400).json({ error: 'tier is required' });

      const result = await PaymentService.initializePayment(userId, tier);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/payments/store/initialize
   * Body: { tier: 'premium' | 'gold', platform: 'android' | 'ios' }
   */
  async initializeStorePurchase(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const { tier, platform } = req.body;

      if (!tier) return res.status(400).json({ error: 'tier is required' });
      if (!platform) return res.status(400).json({ error: 'platform is required' });

      const result = await PaymentService.initializeStorePurchase(userId, tier, platform);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/payments/store/validate
   * Body: { tier, platform, productId, purchaseToken?, receipt?, transactionId? }
   */
  async validateStorePurchase(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const { tier, platform, productId, purchaseToken, transactionId, receipt } = req.body;

      if (!tier || !platform || !productId) {
        return res.status(400).json({ error: 'tier, platform and productId are required' });
      }

      if (platform === 'android' && !purchaseToken) {
        return res.status(400).json({ error: 'purchaseToken is required for Android validation' });
      }

      if (platform === 'ios' && !transactionId) {
        return res.status(400).json({ error: 'transactionId is required for iOS App Store validation' });
      }

      const result = await PaymentService.validateStorePurchase({
        userId,
        tier,
        platform,
        purchaseToken,
        transactionId,
        receipt,
        productId,
      });
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/payments/entitlements
   * Returns caller's active subscription tier and features.
   */
  async getEntitlements(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const result = await PaymentService.getEntitlements(userId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/payments/verify/:reference
   * Verifies a Paystack transaction and upgrades the user's subscription tier
   */
  async verifyPayment(req, res, next) {
    try {
      const { reference } = req.params;
      const result = await PaymentService.verifyPayment(reference);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/payments/webhook
   * Paystack webhook for server-side event confirmation
   */
  async webhook(req, res, next) {
    try {
      // Verify webhook signature
      const hash = crypto
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== req.headers['x-paystack-signature']) {
        return res.status(400).json({ error: 'Invalid signature' });
      }

      const { event, data } = req.body;
      const result = await PaymentService.handleWebhook(event, data);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
