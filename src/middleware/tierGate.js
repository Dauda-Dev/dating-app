const db = require('../config/database');

const TIER_RANK = { free: 0, premium: 1, gold: 2 };

/**
 * requireTier(...tiers)
 * Middleware factory that allows access only if the authenticated user's
 * subscriptionTier is one of the specified tiers.
 *
 * Usage:
 *   router.post('/steals/request', authenticateJWT, requireTier('gold'), controller.createRequest);
 *   router.get('/discovery/liked-me', authenticateJWT, requireTier('premium', 'gold'), controller.likedMe);
 */
const requireTier = (...allowedTiers) => async (req, res, next) => {
  try {
    const userId = req.userId || req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const user = await db.User.findByPk(userId, {
      attributes: ['id', 'subscriptionTier'],
    });

    if (!user) return res.status(401).json({ error: 'User not found' });

    const userTier = user.subscriptionTier || 'free';

    if (!allowedTiers.includes(userTier)) {
      const minTier = allowedTiers.reduce((best, t) =>
        TIER_RANK[t] < TIER_RANK[best] ? t : best
      , allowedTiers[0]);

      return res.status(403).json({
        error: 'Subscription required',
        requiredTier: minTier,
        currentTier: userTier,
        upgradeRequired: true,
        message: `This feature requires a ${minTier} plan or higher. Upgrade in Settings → Upgrade Plan.`,
      });
    }

    // Attach tier to request so controllers can use it without another DB hit
    req.subscriptionTier = userTier;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireTier, TIER_RANK };
