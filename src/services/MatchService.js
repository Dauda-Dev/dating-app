const db = require('../config/database');
const { Op } = require('sequelize');

class MatchService {
  /**
   * Process mutual likes and create match if both users are AVAILABLE
   * TRANSACTION SAFE
   */
  async processLikeAndCreateMatch(fromUserId, toUserId, likeType = 'like') {
    const transaction = await db.sequelize.transaction();
    
    try {
      // Get fresh user states with row-level lock
      const fromUser = await db.User.findByPk(fromUserId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      
      const toUser = await db.User.findByPk(toUserId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!fromUser || !toUser) {
        throw new Error('One or both users not found');
      }

      // Handle reject: just record it and bail out, no match check needed
      if (likeType === 'reject') {
        // Upsert — avoid duplicate reject rows
        await db.Like.findOrCreate({
          where: { fromUserId, toUserId },
          defaults: { fromUserId, toUserId, likeType: 'reject' },
          transaction,
        });
        await transaction.commit();
        return { matched: false, message: 'User rejected.' };
      }

      // Guard: if this user already liked the target, don't create duplicate
      const existingLike = await db.Like.findOne({
        where: { fromUserId, toUserId },
        transaction,
      });
      if (existingLike) {
        await transaction.rollback();
        return { matched: false, message: 'Already liked.' };
      }

      // Check if mutual like exists (like or super_like from the other side)
      const mutualLike = await db.Like.findOne({
        where: {
          fromUserId: toUserId,
          toUserId: fromUserId,
          likeType: { [Op.in]: ['like', 'super_like'] }
        },
        transaction,
      });

      if (!mutualLike) {
        // No mutual like yet, just create the like with correct type
        await db.Like.create({
          fromUserId,
          toUserId,
          likeType,
        }, { transaction });
        
        await transaction.commit();
        return { 
          matched: false, 
          message: 'Like recorded. Waiting for mutual like.' 
        };
      }

      // MUTUAL LIKE DETECTED - Create match
      const match = await db.Match.create({
        user1Id: fromUserId,
        user2Id: toUserId,
        status: 'matched_locked',
      }, { transaction });

      // Record this like too
      await db.Like.create({
        fromUserId,
        toUserId,
        likeType,
      }, { transaction });

      // Update both users to MATCHED_LOCKED
      await fromUser.update(
        { relationshipStatus: 'matched_locked' },
        { transaction }
      );
      
      await toUser.update(
        { relationshipStatus: 'matched_locked' },
        { transaction }
      );

      await transaction.commit();
      
      return {
        matched: true,
        match: {
          id: match.id,
          user1Id: match.user1Id,
          user2Id: match.user2Id,
          status: match.status,
        },
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get all matches for a user (paginated)
   */
  async getUserMatches(userId, limit = 10, offset = 0) {
    const matches = await db.Match.findAndCountAll({
      where: {
        [Op.or]: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      },
      include: [
        {
          model: db.User,
          as: 'User1',
          attributes: ['id', 'firstName', 'lastName', 'profilePhoto'],
          include: [{
            model: db.Profile,
            as: 'profile',
            attributes: ['bio', 'interests', 'hobbies', 'photos', 'hotTakes']
          }]
        },
        {
          model: db.User,
          as: 'User2',
          attributes: ['id', 'firstName', 'lastName', 'profilePhoto'],
          include: [{
            model: db.Profile,
            as: 'profile',
            attributes: ['bio', 'interests', 'hobbies', 'photos', 'hotTakes']
          }]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return {
      matches: matches.rows,
      total: matches.count,
      limit,
      offset
    };
  }

  /**
   * Get current active match for user
   */
  async getActiveMatch(userId) {
    const match = await db.Match.findOne({
      where: {
        [Op.or]: [
          { user1Id: userId },
          { user2Id: userId }
        ],
        status: {
          [Op.in]: ['matched_locked', 'video_call_completed', 'date_accepted']
        }
      },
      include: [
        {
          model: db.User,
          as: 'User1',
          attributes: ['id', 'firstName', 'lastName', 'profilePhoto'],
          include: [{
            model: db.Profile,
            as: 'profile',
            attributes: ['bio', 'location', 'interests', 'hobbies', 'photos', 'hotTakes']
          }]
        },
        {
          model: db.User,
          as: 'User2',
          attributes: ['id', 'firstName', 'lastName', 'profilePhoto'],
          include: [{
            model: db.Profile,
            as: 'profile',
            attributes: ['bio', 'location', 'interests', 'hobbies', 'photos', 'hotTakes']
          }]
        }
      ]
    });

    return match;
  }

  /**
   * Reject a match (user must be MATCHED_LOCKED status)
   * TRANSACTION SAFE
   */
  async rejectMatch(userId, matchId) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const match = await db.Match.findByPk(matchId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!match) {
        throw new Error('Match not found');
      }

      const isUser1 = match.user1Id === userId;
      const isUser2 = match.user2Id === userId;

      if (!isUser1 && !isUser2) {
        throw new Error('User is not part of this match');
      }

      // Delete the match
      await match.destroy({ transaction });

      // Reset both users to AVAILABLE
      const user1 = await db.User.findByPk(match.user1Id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      
      const user2 = await db.User.findByPk(match.user2Id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      await user1.update(
        { relationshipStatus: 'available' },
        { transaction }
      );
      
      await user2.update(
        { relationshipStatus: 'available' },
        { transaction }
      );

      await transaction.commit();

      return { success: true, message: 'Match rejected' };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get match by ID with all details
   */
  async getMatchById(matchId) {
    const match = await db.Match.findByPk(matchId, {
      include: [
        {
          model: db.User,
          as: 'User1',
          attributes: ['id', 'firstName', 'lastName', 'profilePhoto'],
          include: [{
            model: db.Profile,
            as: 'profile'
          }]
        },
        {
          model: db.User,
          as: 'User2',
          attributes: ['id', 'firstName', 'lastName', 'profilePhoto'],
          include: [{
            model: db.Profile,
            as: 'profile'
          }]
        },
        {
          model: db.VideoSession,
          as: 'videoSessions'
        }
      ]
    });

    if (!match) return null;

    // Synthesize a dates array from the match's own proposal fields
    // so the mobile app can find pendingDate / acceptedDate
    const plain = match.toJSON();
    plain.videoSession = plain.videoSessions?.[0] || null;

    if (plain.plannedDateTime) {
      const isAccepted = plain.status === 'date_accepted';
      plain.dates = [{
        id: plain.id,           // use match id as a stable key
        matchId: plain.id,
        proposedDate: plain.plannedDateTime,
        location: plain.plannedDateLocation,
        venue: plain.plannedVenue,
        message: plain.dateProposalMessage,
        proposerId: plain.proposedById,
        proposedById: plain.proposedById,
        status: isAccepted ? 'accepted' : 'pending',
      }];
    } else {
      plain.dates = [];
    }

    return plain;
  }
}

module.exports = new MatchService();
