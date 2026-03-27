const axios = require('axios');
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

class PaymentService {
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

    await user.update({ subscriptionTier: tier });

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
          await user.update({ subscriptionTier: tier });
          console.log(`[Webhook] Upgraded user ${userId} to ${tier}`);
        }
      }
    }
    return { received: true };
  }

  getPlanInfo() {
    return PLANS;
  }
}

module.exports = new PaymentService();
