const db = require('../config/database');
const { Op } = require('sequelize');

class DiscoveryService {
  /**
   * Get eligible users for discovery (AVAILABLE users not already liked)
   */
  async getEligibleUsers(userId, limit = 20, offset = 0) {
    const user = await db.User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Get all users this user has already liked or rejected
    const alreadyInteracted = await db.Like.findAll({
      where: { fromUserId: userId },
      attributes: ['toUserId'],
      raw: true,
    });

    const interactedUserIds = alreadyInteracted.map(l => l.toUserId);

    // Get user's profile preferences
    const userProfile = await db.Profile.findOne({
      where: { userId }
    });

    const preferredGender = (!userProfile?.preferredGender || userProfile.preferredGender === 'any')
      ? ['male', 'female', 'non-binary']
      : [userProfile.preferredGender];

    // Find users matching preferences (any relationship status — steal mechanic allows targeting matched users)
    const excludeIds = [...new Set([...interactedUserIds, userId])];
    const eligibleUsers = await db.User.findAll({
      where: {
        id: { [Op.notIn]: excludeIds },
        gender: { [Op.in]: preferredGender },
        isActive: true
      },
      include: [
        {
          model: db.Profile,
          as: 'profile',
          attributes: ['bio', 'interests', 'hobbies', 'photos', 'occupation']
        }
      ],
      attributes: ['id', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'profilePhoto', 'relationshipStatus'],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      raw: false,
    });

    return eligibleUsers;
  }

  /**
   * Calculate compatibility score between two users
   */
  calculateCompatibility(user1Profile, user2Profile) {
    let score = 0;

    // Shared interests
    if (user1Profile?.interests && user2Profile?.interests) {
      const sharedInterests = user1Profile.interests.filter(i =>
        user2Profile.interests.includes(i)
      );
      score += sharedInterests.length * 15;
    }

    // Shared hobbies
    if (user1Profile?.hobbies && user2Profile?.hobbies) {
      const sharedHobbies = user1Profile.hobbies.filter(h =>
        user2Profile.hobbies.includes(h)
      );
      score += sharedHobbies.length * 10;
    }

    // Cap score at 100
    return Math.min(score, 100);
  }

  /**
   * Get user discovery card details
   */
  async getUserCard(userId) {
    const user = await db.User.findByPk(userId, {
      include: [{
        model: db.Profile,
        as: 'profile'
      }],
      attributes: ['id', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'profilePhoto', 'relationshipStatus']
    });

    return user;
  }
}

module.exports = new DiscoveryService();
