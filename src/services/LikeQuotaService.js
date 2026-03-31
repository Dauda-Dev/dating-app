const db = require('../config/database');
const { Op } = require('sequelize');

const FREE_DAILY_LIMIT = 10;

/**
 * LikeQuotaService
 * Tracks and enforces daily like limits based on subscription tier.
 *
 * Quotas:
 *   free    → 10 likes per calendar day
 *   premium → unlimited
 *   gold    → unlimited
 */

/**
 * checkQuota(userId)
 * Returns an object describing whether the user may still like someone today.
 * Does NOT consume a like — just inspects the count.
 *
 * @param {string} userId
 * @returns {{ allowed: boolean, used: number, limit: number|null, remaining: number|null }}
 */
const checkQuota = async (userId) => {
  const user = await db.User.findByPk(userId, {
    attributes: ['id', 'subscriptionTier'],
  });

  const tier = user?.subscriptionTier || 'free';

  // Paid tiers → unlimited
  if (tier === 'premium' || tier === 'gold') {
    return {
      allowed: true,
      used: null,
      limit: null,
      remaining: null,
      tier,
    };
  }

  // Free tier → count today's likes
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const used = await db.Like.count({
    where: {
      fromUserId: userId,
      likeType: { [Op.in]: ['like', 'super_like'] },
      createdAt: { [Op.gte]: startOfDay },
    },
  });

  const remaining = Math.max(0, FREE_DAILY_LIMIT - used);

  return {
    allowed: remaining > 0,
    used,
    limit: FREE_DAILY_LIMIT,
    remaining,
    tier,
  };
};

module.exports = { checkQuota, FREE_DAILY_LIMIT };
