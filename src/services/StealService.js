const db = require('../config/database');
const { Op } = require('sequelize');

class StealService {
  /**
   * Create steal request
   * Requester must be AVAILABLE, Target must be POST_DATE_OPEN
   */
  async createStealRequest(requesterId, targetUserId) {
    // Validation
    const requester = await db.User.findByPk(requesterId);
    const target = await db.User.findByPk(targetUserId);

    if (!requester || !target) {
      throw new Error('User not found');
    }

    if (requesterId === targetUserId) {
      throw new Error('Cannot steal yourself');
    }

    if (requester.relationshipStatus !== 'available') {
      throw new Error('You must be AVAILABLE to request stealing');
    }

    if (target.relationshipStatus !== 'post_date_open') {
      throw new Error('Target user is not available for stealing');
    }

    // Get target's current match
    const currentMatch = await db.Match.findOne({
      where: {
        [Op.or]: [
          { user1Id: targetUserId },
          { user2Id: targetUserId }
        ],
        matchStatus: 'post_date_open'
      }
    });

    // Create steal request
    const stealRequest = await db.StealRequest.create({
      requesterId,
      targetUserId,
      currentMatchId: currentMatch?.id,
      expiresAt: new Date(Date.now() + (parseInt(process.env.STEAL_REQUEST_EXPIRY_HOURS) || 48) * 60 * 60 * 1000),
    });

    return stealRequest;
  }

  /**
   * Accept steal request and break old match
   * TRANSACTION SAFE - Critical for integrity
   */
  async acceptStealRequest(stealRequestId, acceptingUserId) {
    const transaction = await db.sequelize.transaction();

    try {
      const stealRequest = await db.StealRequest.findByPk(
        stealRequestId,
        { transaction, lock: transaction.LOCK.UPDATE }
      );

      if (!stealRequest) {
        throw new Error('Steal request not found');
      }

      if (stealRequest.status !== 'pending') {
        throw new Error('Steal request already processed');
      }

      if (new Date() > stealRequest.expiresAt) {
        throw new Error('Steal request has expired');
      }

      // Verify the accepting user is the target
      if (stealRequest.targetUserId !== acceptingUserId) {
        throw new Error('Only the target user can accept the steal request');
      }

      // Lock all users involved
      const requester = await db.User.findByPk(
        stealRequest.requesterId,
        { transaction, lock: transaction.LOCK.UPDATE }
      );

      const target = await db.User.findByPk(
        acceptingUserId,
        { transaction, lock: transaction.LOCK.UPDATE }
      );

      if (!requester || !target) {
        throw new Error('One or both users not found');
      }

      if (requester.relationshipStatus !== 'available') {
        throw new Error('Requester is no longer AVAILABLE');
      }

      if (target.relationshipStatus !== 'post_date_open') {
        throw new Error('Target user is no longer available for stealing');
      }

      // Get old match
      const oldMatch = await db.Match.findByPk(
        stealRequest.currentMatchId,
        { transaction, lock: transaction.LOCK.UPDATE }
      );

      if (!oldMatch) {
        throw new Error('Original match not found');
      }

      const oldPartner = oldMatch.user1Id === acceptingUserId
        ? await db.User.findByPk(oldMatch.user2Id, {
            transaction,
            lock: transaction.LOCK.UPDATE
          })
        : await db.User.findByPk(oldMatch.user1Id, {
            transaction,
            lock: transaction.LOCK.UPDATE
          });

      if (!oldPartner) {
        throw new Error('Old partner not found');
      }

      // Delete old match and reset old partner to AVAILABLE
      await oldMatch.destroy({ transaction });
      await oldPartner.update(
        { relationshipStatus: 'available' },
        { transaction }
      );

      // Create new match
      const newMatch = await db.Match.create({
        user1Id: stealRequest.requesterId,
        user2Id: stealRequest.targetUserId,
        status: 'matched_locked',
      }, { transaction });

      // Update both users in new match
      await requester.update(
        { relationshipStatus: 'matched_locked' },
        { transaction }
      );

      await target.update(
        { relationshipStatus: 'matched_locked' },
        { transaction }
      );

      // Mark steal request as accepted
      await stealRequest.update(
        {
          status: 'accepted',
          respondedAt: new Date(),
        },
        { transaction }
      );

      // Auto-reject all other pending steals targeting the same user
      await db.StealRequest.update(
        { status: 'rejected', respondedAt: new Date() },
        {
          where: {
            targetUserId: stealRequest.targetUserId,
            status: 'pending',
            id: { [Op.ne]: stealRequest.id },
          },
          transaction,
        }
      );

      await transaction.commit();

      return {
        success: true,
        newMatchId: newMatch.id,
        message: 'User successfully stolen! New match created.'
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Reject steal request
   */
  async rejectStealRequest(stealRequestId, rejectingUserId) {
    const stealRequest = await db.StealRequest.findByPk(stealRequestId);

    if (!stealRequest) {
      throw new Error('Steal request not found');
    }

    if (stealRequest.status !== 'pending') {
      throw new Error('Steal request already processed');
    }

    if (stealRequest.targetUserId !== rejectingUserId) {
      throw new Error('Only the target user can reject the steal request');
    }

    await stealRequest.update({
      status: 'rejected',
      respondedAt: new Date(),
    });

    return { success: true, message: 'Steal request rejected' };
  }

  /**
   * Get pending steal requests for a user
   */
  async getPendingStealRequests(userId) {
    const requests = await db.StealRequest.findAll({
      where: {
        targetUserId: userId,
        status: 'pending',
        expiresAt: { [Op.gt]: new Date() }
      },
      include: [
        {
          model: db.User,
          as: 'Requester',
          attributes: ['id', 'firstName', 'lastName', 'profilePhoto', 'gender', 'dateOfBirth'],
          include: [{
            model: db.Profile,
            as: 'profile',
            attributes: ['bio', 'location', 'interests', 'hobbies']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return requests;
  }

  /**
   * Get steal requests sent BY a user
   */
  async getSentStealRequests(userId) {
    const requests = await db.StealRequest.findAll({
      where: { requesterId: userId },
      include: [
        {
          model: db.User,
          as: 'Target',
          attributes: ['id', 'firstName', 'lastName', 'profilePhoto'],
          include: [{
            model: db.Profile,
            as: 'profile',
            attributes: ['bio', 'location']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    return requests;
  }

  /**
   * Get all steal requests for a user (received and initiated)
   */
  async getStealRequestHistory(userId, limit = 50, offset = 0) {
    const requests = await db.StealRequest.findAll({
      where: {
        [Op.or]: [
          { requesterId: userId },
          { targetUserId: userId }
        ]
      },
      include: [
        {
          model: db.User,
          as: 'Requester',
          attributes: ['id', 'firstName', 'lastName', 'profilePhoto']
        },
        {
          model: db.User,
          as: 'Target',
          attributes: ['id', 'firstName', 'lastName', 'profilePhoto']
        }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return requests;
  }
}

module.exports = new StealService();
