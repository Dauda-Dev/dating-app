const DiscoveryService = require('../services/DiscoveryService');
const MatchService = require('../services/MatchService');
const EmailService = require('../services/EmailService');
const LikeQuotaService = require('../services/LikeQuotaService');
const db = require('../config/database');

module.exports = {
  async eligibleUsers(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const { limit = 20, offset = 0, maxDistance, ageMin, ageMax, lat, lon } = req.query;

      // If the client sent a live location, persist it on the user record
      if (lat && lon) {
        const db = require('../config/database');
        await db.User.update(
          { latitude: parseFloat(lat), longitude: parseFloat(lon) },
          { where: { id: userId } }
        );
      }

      const filters = {
        maxDistance: maxDistance ? parseInt(maxDistance, 10) : undefined,
        ageMin: ageMin ? parseInt(ageMin, 10) : undefined,
        ageMax: ageMax ? parseInt(ageMax, 10) : undefined,
      };

      const users = await DiscoveryService.getEligibleUsers(
        userId,
        parseInt(limit, 10),
        parseInt(offset, 10),
        filters,
      );
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
      
      // Send email notifications on match or super-like
      try {
        if (result.matched) {
          const matchRecord = await MatchService.getMatchById(result.match.id);
          if (matchRecord) {
            const toUser = matchRecord.user1Id === fromUserId ? matchRecord.User2 : matchRecord.User1;
            if (toUser?.email) {
              await EmailService.sendMatchNotification(toUser.email, toUser.firstName);
            }
          }
        } else if (likeType === 'super_like') {
          // Notify the target that someone super-liked them (Premium/Gold feature feel)
          const targetUser = await db.User.findByPk(targetUserId, { attributes: ['email', 'firstName'] });
          const senderUser = await db.User.findByPk(fromUserId, { attributes: ['firstName'] });
          if (targetUser?.email && senderUser) {
            await EmailService.sendSuperLikeNotification(targetUser.email, targetUser.firstName, senderUser.firstName);
          }
        }
      } catch (emailErr) {
        console.error('Error sending like/match notification:', emailErr);
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
      const parsedLimit = parseInt(limit, 10);
      const parsedOffset = parseInt(offset, 10);

      const { count, rows: likes } = await db.Like.findAndCountAll({
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
                attributes: ['bio', 'interests', 'hobbies', 'photos'],
                required: false,
              },
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: parsedLimit,
        offset: parsedOffset,
      });

      const users = likes
        .filter(l => l.FromUser)
        .map(l => ({
          ...l.FromUser.toJSON(),
          isSuperLike: l.likeType === 'super_like',
          likedAt: l.createdAt,
        }));

      return res.json({ users, total: count });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/discovery/undo
   * Removes the most recent non-mutual like/reject the user sent,
   * allowing that person to reappear in discovery.
   */
  async undo(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;

      const lastLike = await db.Like.findOne({
        where: {
          fromUserId: userId,
          isMutual: false,
        },
        order: [['createdAt', 'DESC']],
      });

      if (!lastLike) {
        return res.status(404).json({ error: 'Nothing to undo' });
      }

      const revertedUserId = lastLike.toUserId;
      await lastLike.destroy();

      return res.json({ success: true, revertedUserId });
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
