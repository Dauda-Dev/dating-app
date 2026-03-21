const db = require('../config/database');

class DateService {
  /**
   * Propose date details (location and time)
   */
  async proposeDateDetails(matchId, userId, location, proposedDateTime) {
    const match = await db.Match.findByPk(matchId);

    if (!match) {
      throw new Error('Match not found');
    }

    const isUser1 = match.user1Id === userId;
    const isUser2 = match.user2Id === userId;

    if (!isUser1 && !isUser2) {
      throw new Error('User is not part of this match');
    }

    if (match.matchStatus !== 'VIDEO_COMPLETED') {
      throw new Error('Video call must be completed before proposing date');
    }

    // Update match with proposed date details
    await match.update({
      plannedDateLocation: location,
      plannedDateTime: proposedDateTime,
    });

    return { success: true, match };
  }

  /**
   * Accept date proposal
   * TRANSACTION SAFE
   */
  async acceptDateProposal(matchId, userId) {
    const transaction = await db.sequelize.transaction();

    try {
      const match = await db.Match.findByPk(matchId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!match) {
        throw new Error('Match not found');
      }

      if (!match.plannedDateLocation || !match.plannedDateTime) {
        throw new Error('Date details not yet proposed');
      }

      const isUser1 = match.user1Id === userId;
      const isUser2 = match.user2Id === userId;

      if (!isUser1 && !isUser2) {
        throw new Error('User is not part of this match');
      }

      await match.update(
        { matchStatus: 'DATE_AGREED', dateAgreedAt: new Date() },
        { transaction }
      );

      // Update both users to DATE_ACCEPTED
      const user1 = await db.User.findByPk(match.user1Id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      
      const user2 = await db.User.findByPk(match.user2Id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      await user1.update(
        { relationshipStatus: 'DATE_ACCEPTED' },
        { transaction }
      );
      
      await user2.update(
        { relationshipStatus: 'DATE_ACCEPTED' },
        { transaction }
      );

      await transaction.commit();

      return { success: true, match };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Mark date as completed and open for stealing
   * TRANSACTION SAFE
   */
  async completeDateAndOpenForStealing(matchId) {
    const transaction = await db.sequelize.transaction();

    try {
      const match = await db.Match.findByPk(matchId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!match) {
        throw new Error('Match not found');
      }

      await match.update(
        {
          matchStatus: 'COMPLETED',
          dateCompletedAt: new Date(),
        },
        { transaction }
      );

      // Update both users to POST_DATE_OPEN
      const user1 = await db.User.findByPk(match.user1Id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      
      const user2 = await db.User.findByPk(match.user2Id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      await user1.update(
        { relationshipStatus: 'POST_DATE_OPEN' },
        { transaction }
      );
      
      await user2.update(
        { relationshipStatus: 'POST_DATE_OPEN' },
        { transaction }
      );

      await transaction.commit();

      return { 
        success: true, 
        message: 'Date marked as completed. Users now available for stealing.' 
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new DateService();
