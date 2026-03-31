const DiscoveryService = require('../services/DiscoveryService');
const MatchService = require('../services/MatchService');
const EmailService = require('../services/EmailService');
const LikeQuotaService = require('../services/LikeQuotaService');
const db = require('../config/database');

module.exports = {
  async eligibleUsers(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const { limit = 20, offset = 0 } = req.query;
      const users = await DiscoveryService.getEligibleUsers(userId, parseInt(limit, 10), parseInt(offset, 10));
      return res.json({ users });
    } catch (err) {
      next(err);
    }
  },

  async like(req, res, next) {
    try {
      const fromUserId = req.userId || req.user?.userId;
      const { toUserId, userId: bodyUserId, likeType = 'like' } = req.body;
      const targetUserId = toUserId || bodyUserId;
      if (!targetUserId) return res.status(400).json({ error: 'toUserId is required' });

      // Enforce daily like quota for free-tier users
      const quota = await LikeQuotaService.checkQuota(fromUserId);
      if (!quota.allowed) {
        return res.status(429).json({
          error: 'Daily like limit reached',
          limit: quota.limit,
          used: quota.used,
          remaining: 0,
          resetAt: (() => {
            const tomorrow = new Date();
            tomorrow.setHours(24, 0, 0, 0);
            return tomorrow.toISOString();
          })(),
          upgradeRequired: true,
          message: `Free plan allows ${quota.limit} likes per day. Upgrade to Premium or Gold for unlimited likes.`,
        });
      }

      const result = await MatchService.processLikeAndCreateMatch(fromUserId, targetUserId, likeType);

      // Attach remaining quota to response so mobile can update the counter
      if (quota.limit !== null) {
        result.quota = {
          used: quota.used + 1,
          limit: quota.limit,
          remaining: Math.max(0, quota.remaining - 1),
        };
      }
      
      // Send email notifications on match
      if (result.matched) {
        try {
          const fromUser = await MatchService.getMatchById(result.match.id);
          if (fromUser) {
            const toUser = fromUser.user1Id === fromUserId ? fromUser.User2 : fromUser.User1;
            const matchedUser = fromUser.user1Id === fromUserId ? fromUser.User2 : fromUser.User1;
            
            if (toUser && toUser.email) {
              await EmailService.sendMatchNotification(toUser.email, matchedUser.firstName);
            }
          }
        } catch (emailErr) {
          console.error('Error sending match notification:', emailErr);
        }
      }
      
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getUserCard(req, res, next) {
    try {
      const { id } = req.params;
      const userCard = await DiscoveryService.getUserCard(id);
      if (!userCard) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: userCard });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/discovery/liked-me  (Premium + Gold only)
   * Returns a paginated list of users who have liked the authenticated user
   * but haven't been matched yet (isMutual = false).
   */
  async likedMe(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const { limit = 20, offset = 0 } = req.query;

      const likes = await db.Like.findAll({
        where: {
          toUserId: userId,
          likeType: ['like', 'super_like'],
          isMutual: false,
        },
        include: [
          {
            model: db.User,
            as: 'FromUser',
            attributes: ['id', 'firstName', 'lastName', 'profilePhoto', 'dateOfBirth', 'gender', 'subscriptionTier'],
            include: [
              {
                model: db.Profile,
                as: 'Profile',
                attributes: ['bio', 'interests', 'hobbies', 'location', 'photos'],
                required: false,
              },
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });

      const users = likes.map((l) => l.FromUser).filter(Boolean);
      return res.json({ users, total: users.length });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/discovery/quota
   * Returns the current user's daily like quota info.
   */
  async getQuota(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const quota = await LikeQuotaService.checkQuota(userId);

      const resetAt = (() => {
        const tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0);
        return tomorrow.toISOString();
      })();

      return res.json({
        tier: quota.tier,
        unlimited: quota.limit === null,
        used: quota.used,
        limit: quota.limit,
        remaining: quota.remaining,
        resetAt: quota.limit !== null ? resetAt : null,
      });
    } catch (err) {
      next(err);
    }
  },
};
