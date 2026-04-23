const axios = require('axios');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = 'https://api.paystack.co';

const PLANS = {
  premium: {
    name: 'Premium',
    amount: 200000, // NGN 2,000 in kobo
    features: ['Unlimited swipes', 'See who liked you', 'Priority discovery'],
  },
  gold: {
    name: 'Gold',
    amount: 500000, // NGN 5,000 in kobo
    features: ['Everything in Premium', 'Unlimited steals', 'Profile boost', 'Read receipts'],
  },
};

const STORE_PRODUCT_IDS = {
  android: {
    premium: process.env.GOOGLE_PLAY_PREMIUM_PRODUCT_ID || 'ovally_premium_monthly',
    gold: process.env.GOOGLE_PLAY_GOLD_PRODUCT_ID || 'ovally_gold_monthly',
  },
  ios: {
    premium: process.env.APPLE_PREMIUM_PRODUCT_ID || 'ovally.premium.monthly',
    gold: process.env.APPLE_GOLD_PRODUCT_ID || 'ovally.gold.monthly',
  },
};

class PaymentService {
  getSubscriptionProvider() {
    return process.env.SUBSCRIPTION_PROVIDER || 'store';
  }

  getStoreProductId(tier, platform) {
    const byPlatform = STORE_PRODUCT_IDS[platform];
    if (!byPlatform) throw new Error('Unsupported platform. Use "android" or "ios".');

    const productId = byPlatform[tier];
    if (!productId) {
      throw new Error(`No product configured for tier: ${tier}`);
    }
    return productId;
  }

  /**
   * Initialize a Paystack transaction for a subscription upgrade
   */
  async initializePayment(userId, tier) {
    if (!['premium', 'gold'].includes(tier)) {
      throw new Error('Invalid subscription tier. Choose "premium" or "gold".');
    }

    const user = await db.User.findByPk(userId);
    if (!user) throw new Error('User not found');

    if (user.subscriptionTier === tier) {
      throw new Error(`You are already on the ${tier} plan.`);
    }

    const plan = PLANS[tier];

    const response = await axios.post(
      `${PAYSTACK_BASE}/transaction/initialize`,
      {
        email: user.email,
        amount: plan.amount,
        currency: 'NGN',
        metadata: {
          userId,
          tier,
          custom_fields: [
            { display_name: 'Plan', variable_name: 'plan', value: plan.name },
            { display_name: 'User ID', variable_name: 'user_id', value: userId },
          ],
        },
        callback_url: `${process.env.APP_URL || 'https://yourdomain.com'}/api/payments/callback`,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      authorizationUrl: response.data.data.authorization_url,
      accessCode: response.data.data.access_code,
      reference: response.data.data.reference,
      plan: plan.name,
      amount: plan.amount / 100,
      currency: 'NGN',
    };
  }

  /**
   * Initialize native store purchase (Google Play / App Store).
   * Client uses returned productId to launch in-app billing flow.
   */
  async initializeStorePurchase(userId, tier, platform) {
    if (!['premium', 'gold'].includes(tier)) {
      throw new Error('Invalid subscription tier. Choose "premium" or "gold".');
    }

    const user = await db.User.findByPk(userId);
    if (!user) throw new Error('User not found');

    if (user.subscriptionTier === tier) {
      throw new Error(`You are already on the ${tier} plan.`);
    }

    const productId = this.getStoreProductId(tier, platform);

    return {
      provider: platform === 'android' ? 'google_play' : 'apple_app_store',
      checkoutType: 'in_app',
      status: 'pending_client_purchase',
      tier,
      productId,
      message: 'Launch native in-app purchase and submit the receipt/purchase token to /api/payments/store/validate.',
    };
  }

  normalizeSubscriptionStatus(status) {
    if (!status) return 'inactive';
    const s = String(status).toLowerCase();
    if (s === 'active') return 'active';
    if (s === 'grace_period') return 'grace_period';
    if (s === 'expired') return 'expired';
    if (s === 'revoked') return 'revoked';
    if (s === 'cancelled') return 'cancelled';
    return 'inactive';
  }

  async applyEntitlementTransition(user, {
    tier,
    provider,
    productId,
    status,
    expiresAt,
    source,
  }) {
    const normalizedStatus = this.normalizeSubscriptionStatus(status);
    const now = new Date();
    const expiryDate = expiresAt ? new Date(expiresAt) : null;

    let resolvedTier = tier;
    if (['inactive', 'expired', 'revoked'].includes(normalizedStatus)) {
      resolvedTier = 'free';
    }
    if (normalizedStatus === 'cancelled' && expiryDate && expiryDate <= now) {
      resolvedTier = 'free';
    }

    await user.update({
      subscriptionTier: resolvedTier,
      subscriptionProvider: provider,
      subscriptionStatus: normalizedStatus,
      subscriptionProductId: productId || null,
      subscriptionExpiresAt: expiryDate,
      subscriptionLastValidatedAt: now,
    });

    return {
      tier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionProvider: user.subscriptionProvider,
      subscriptionProductId: user.subscriptionProductId,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      validatedAt: now,
      source,
    };
  }

  async verifyGooglePlaySubscription({ productId, purchaseToken }) {
    const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
    if (!packageName) {
      throw new Error('GOOGLE_PLAY_PACKAGE_NAME is not configured');
    }

    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const authClient = await auth.getClient();
    const androidpublisher = google.androidpublisher({ version: 'v3', auth: authClient });

    const response = await androidpublisher.purchases.subscriptionsv2.get({
      packageName,
      token: purchaseToken,
    });

    const payload = response.data || {};
    const lineItems = payload.lineItems || [];
    const lineItem = lineItems.find((li) => li.productId === productId) || lineItems[0];

    if (!lineItem) {
      throw new Error('Google Play validation succeeded but no subscription line item found');
    }

    const subscriptionState = payload.subscriptionState;
    let status = 'inactive';
    if (subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE') status = 'active';
    else if (subscriptionState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD') status = 'grace_period';
    else if (subscriptionState === 'SUBSCRIPTION_STATE_EXPIRED') status = 'expired';
    else if (subscriptionState === 'SUBSCRIPTION_STATE_CANCELED') status = 'cancelled';
    else if (subscriptionState === 'SUBSCRIPTION_STATE_REVOKED') status = 'revoked';

    return {
      provider: 'google_play',
      productId: lineItem.productId || productId,
      status,
      expiresAt: lineItem.expiryTime || null,
      raw: payload,
    };
  }

  buildAppleApiToken() {
    const issuerId = process.env.APPLE_ISSUER_ID;
    const keyId = process.env.APPLE_KEY_ID;
    const bundleId = process.env.APPLE_BUNDLE_ID;
    const privateKey = (process.env.APPLE_APP_STORE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!issuerId || !keyId || !bundleId || !privateKey) {
      throw new Error('Apple validation env vars missing (APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_BUNDLE_ID, APPLE_APP_STORE_PRIVATE_KEY)');
    }

    return jwt.sign(
      {
        iss: issuerId,
        aud: 'appstoreconnect-v1',
        bid: bundleId,
      },
      privateKey,
      {
        algorithm: 'ES256',
        expiresIn: '5m',
        keyid: keyId,
      }
    );
  }

  decodeJwsPayload(jws) {
    const [, payload] = String(jws || '').split('.');
    if (!payload) throw new Error('Invalid JWS payload');
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(normalized, 'base64').toString('utf8');
    return JSON.parse(json);
  }

  async verifyAppleSubscription({ productId, transactionId }) {
    if (!transactionId) {
      throw new Error('transactionId is required for iOS App Store validation');
    }

    const token = this.buildAppleApiToken();
    const baseUrl = (process.env.APPLE_USE_SANDBOX || 'false').toLowerCase() === 'true'
      ? 'https://api.storekit-sandbox.itunes.apple.com'
      : 'https://api.storekit.itunes.apple.com';

    const response = await axios.get(
      `${baseUrl}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const signedInfo = response.data?.signedTransactionInfo;
    if (!signedInfo) throw new Error('Apple transaction response missing signedTransactionInfo');

    const payload = this.decodeJwsPayload(signedInfo);
    const nowMs = Date.now();
    const expiryMs = payload.expiresDate ? Number(payload.expiresDate) : null;
    const revoked = !!payload.revocationDate;

    let status = 'inactive';
    if (revoked) status = 'revoked';
    else if (expiryMs && expiryMs > nowMs) status = 'active';
    else if (expiryMs && expiryMs <= nowMs) status = 'expired';

    if (payload.productId && payload.productId !== productId) {
      throw new Error('Apple product ID does not match requested subscription product');
    }

    return {
      provider: 'apple_app_store',
      productId: payload.productId || productId,
      status,
      expiresAt: expiryMs ? new Date(expiryMs).toISOString() : null,
      raw: payload,
    };
  }

  /**
   * Validate and apply a store subscription purchase.
   * Note: server-side verification with Google/Apple APIs is the next step.
   */
  async validateStorePurchase({ userId, tier, platform, purchaseToken, transactionId, receipt, productId }) {
    if (!['premium', 'gold'].includes(tier)) {
      throw new Error('Invalid subscription tier. Choose "premium" or "gold".');
    }
    if (!['android', 'ios'].includes(platform)) {
      throw new Error('Invalid platform. Use "android" or "ios".');
    }

    const expectedProductId = this.getStoreProductId(tier, platform);
    if (productId !== expectedProductId) {
      throw new Error('Product ID does not match configured subscription product');
    }

    if (platform === 'android' && !purchaseToken) {
      throw new Error('purchaseToken is required for Android validation');
    }
    if (platform === 'ios' && !receipt) {
      throw new Error('receipt is required for iOS validation');
    }

    const user = await db.User.findByPk(userId);
    if (!user) throw new Error('User not found');

    let validation;
    if (platform === 'android') {
      validation = await this.verifyGooglePlaySubscription({ productId, purchaseToken });
    } else {
      validation = await this.verifyAppleSubscription({ productId, transactionId });
    }

    const entitlement = await this.applyEntitlementTransition(user, {
      tier,
      provider: validation.provider,
      productId: validation.productId,
      status: validation.status,
      expiresAt: validation.expiresAt,
      source: `${platform}_validation`,
    });

    return {
      success: true,
      tier: entitlement.tier,
      platform,
      productId: entitlement.subscriptionProductId,
      subscriptionStatus: entitlement.subscriptionStatus,
      subscriptionExpiresAt: entitlement.subscriptionExpiresAt,
      transactionId: transactionId || null,
      message: `Subscription updated: ${entitlement.subscriptionStatus}`,
    };
  }

  async getEntitlements(userId) {
    const user = await db.User.findByPk(userId);
    if (!user) throw new Error('User not found');

    const tier = user.subscriptionTier || 'free';
    const plan = PLANS[tier] || null;
    return {
      provider: this.getSubscriptionProvider(),
      tier,
      status: user.subscriptionStatus,
      subscriptionProvider: user.subscriptionProvider,
      subscriptionProductId: user.subscriptionProductId,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      lastValidatedAt: user.subscriptionLastValidatedAt,
      features: plan ? plan.features : [],
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Verify a Paystack transaction and upgrade user tier if successful
   */
  async verifyPayment(reference) {
    const response = await axios.get(
      `${PAYSTACK_BASE}/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      }
    );

    const data = response.data.data;

    if (data.status !== 'success') {
      throw new Error(`Payment not successful. Status: ${data.status}`);
    }

    const { userId, tier } = data.metadata;

    if (!userId || !tier) {
      throw new Error('Invalid payment metadata');
    }

    const user = await db.User.findByPk(userId);
    if (!user) throw new Error('User not found');

    await this.applyEntitlementTransition(user, {
      tier,
      provider: 'paystack',
      productId: null,
      status: 'active',
      expiresAt: null,
      source: 'paystack_verify',
    });

    return {
      success: true,
      tier,
      message: `Successfully upgraded to ${tier} plan!`,
      email: data.customer.email,
      amount: data.amount / 100,
      currency: data.currency,
      paidAt: data.paid_at,
    };
  }

  /**
   * Handle Paystack webhook events
   */
  async handleWebhook(event, data) {
    if (event === 'charge.success') {
      const { userId, tier } = data.metadata || {};
      if (userId && tier) {
        const user = await db.User.findByPk(userId);
        if (user && user.subscriptionTier !== tier) {
          await this.applyEntitlementTransition(user, {
            tier,
            provider: 'paystack',
            productId: null,
            status: 'active',
            expiresAt: null,
            source: 'paystack_webhook',
          });
          console.log(`[Webhook] Upgraded user ${userId} to ${tier}`);
        }
      }
    }
    return { received: true };
  }

  getPlanInfo() {
    return {
      provider: this.getSubscriptionProvider(),
      plans: PLANS,
      products: STORE_PRODUCT_IDS,
    };
  }
}

module.exports = new PaymentService();
