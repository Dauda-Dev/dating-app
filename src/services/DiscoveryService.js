const db = require('../config/database');
const { Op } = require('sequelize');

/**
 * Haversine great-circle distance in kilometres between two lat/lng points.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

class DiscoveryService {
  /**
   * Get eligible users for discovery (AVAILABLE users not already liked).
   * Applies gender preference, age range, and distance filters, then
   * attaches a compatibility score to each result.
   *
   * @param {object} [filters]  Optional overrides from the client filter sheet
   * @param {number} [filters.maxDistance]  km override (takes priority over profile.preferredDistance)
   * @param {number} [filters.ageMin]       min age override
   * @param {number} [filters.ageMax]       max age override
   */
  async getEligibleUsers(userId, limit = 20, offset = 0, filters = {}) {
    const user = await db.User.findByPk(userId, {
      attributes: ['id', 'latitude', 'longitude'],
    });

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

    // Get the caller's profile for preference filters + compatibility
    const myProfile = await db.Profile.findOne({ where: { userId } });

    const preferredGender = (!myProfile?.preferredGender || myProfile.preferredGender === 'any')
      ? ['male', 'female', 'non-binary']
      : [myProfile.preferredGender];

    // Age range — client filter takes priority over stored profile preference
    const ageMin = filters.ageMin ?? myProfile?.ageRange?.min ?? 18;
    const ageMax = filters.ageMax ?? myProfile?.ageRange?.max ?? 99;

    // Convert age bounds to birth-date bounds (today - ageMax → today - ageMin)
    const now = new Date();
    const dobMin = new Date(now.getFullYear() - ageMax, now.getMonth(), now.getDate());
    const dobMax = new Date(now.getFullYear() - ageMin, now.getMonth(), now.getDate());

    // Distance — client filter takes priority; fallback to profile preference; 0 = no filter
    const preferredDistanceKm = filters.maxDistance ?? myProfile?.preferredDistance ?? 0;
    const myLat = user.latitude ? parseFloat(user.latitude) : null;
    const myLon = user.longitude ? parseFloat(user.longitude) : null;
    const canFilterByDistance = preferredDistanceKm > 0 && myLat !== null && myLon !== null;

    // Find users matching preferences (any relationship status — steal mechanic allows targeting matched users)
    const excludeIds = [...new Set([...interactedUserIds, userId])];

    // Fetch a larger batch so we have candidates after distance filtering
    const fetchLimit = canFilterByDistance ? limit * 5 : limit;
    const candidates = await db.User.findAll({
      where: {
        id: { [Op.notIn]: excludeIds },
        gender: { [Op.in]: preferredGender },
        isActive: true,
        dateOfBirth: { [Op.between]: [dobMin, dobMax] },
      },
      include: [
        {
          model: db.Profile,
          as: 'profile',
          attributes: ['bio', 'interests', 'hobbies', 'photos', 'occupation',
            'personalityTraits', 'smoking', 'drinking', 'exerciseFrequency',
            'religion', 'education'],
        },
      ],
      attributes: ['id', 'firstName', 'lastName', 'gender', 'dateOfBirth',
        'profilePhoto', 'relationshipStatus', 'subscriptionTier', 'latitude', 'longitude'],
      // Gold first, then Premium, then Free; within tier by newest
      order: [
        [db.Sequelize.literal(`CASE WHEN "User"."subscription_tier" = 'gold' THEN 0 WHEN "User"."subscription_tier" = 'premium' THEN 1 ELSE 2 END`), 'ASC'],
        ['createdAt', 'DESC'],
      ],
      limit: fetchLimit,
      offset: canFilterByDistance ? 0 : offset,  // offset applied after distance filter when filtering
      raw: false,
    });

    // Distance filter (post-query, avoids complex SQL while keeping things fast enough)
    // Also computes and attaches distanceKm for display on the card
    let eligible = candidates.map(u => {
      const plain = u.toJSON();
      const tLat = u.latitude ? parseFloat(u.latitude) : null;
      const tLon = u.longitude ? parseFloat(u.longitude) : null;
      plain.distanceKm = (myLat !== null && myLon !== null && tLat !== null && tLon !== null)
        ? Math.round(haversineKm(myLat, myLon, tLat, tLon))
        : null;
      return { plain, u };
    });

    if (canFilterByDistance) {
      eligible = eligible.filter(({ plain }) =>
        plain.distanceKm === null || plain.distanceKm <= preferredDistanceKm
      );
      eligible = eligible.slice(offset, offset + limit);
    }

    // Attach compatibility scores
    const results = eligible.map(({ plain, u }) => {
      plain.compatibilityScore = this._compatibility(myProfile, u.profile);
      return plain;
    });

    // Sort by compatibility within each tier group
    results.sort((a, b) => {
      const tierRank = t => (t === 'gold' ? 0 : t === 'premium' ? 1 : 2);
      const tierDiff = tierRank(a.subscriptionTier) - tierRank(b.subscriptionTier);
      if (tierDiff !== 0) return tierDiff;
      return (b.compatibilityScore ?? 0) - (a.compatibilityScore ?? 0);
    });

    return results;
  }

  /**
   * Compatibility score using the rich Profile instance method when available,
   * falling back to the simple interests+hobbies heuristic.
   * Returns 0–100.
   */
  _compatibility(myProfile, theirProfile) {
    if (!myProfile || !theirProfile) return 0;

    let score = 0;

    // Personality (40%)
    if (myProfile.personalityTraits && theirProfile.personalityTraits) {
      const traits = ['extroversion', 'agreeableness', 'conscientiousness', 'neuroticism', 'openness'];
      let totalDiff = 0;
      traits.forEach(t => {
        totalDiff += Math.abs(
          (myProfile.personalityTraits[t] ?? 5) - (theirProfile.personalityTraits[t] ?? 5)
        );
      });
      score += Math.max(0, 100 - (totalDiff / traits.length) * 10) * 0.4;
    }

    // Interest + hobby Jaccard (20%)
    const mySet = new Set([...(myProfile.interests || []), ...(myProfile.hobbies || [])]);
    const theirSet = new Set([...(theirProfile.interests || []), ...(theirProfile.hobbies || [])]);
    const intersection = [...mySet].filter(x => theirSet.has(x)).length;
    const union = new Set([...mySet, ...theirSet]).size;
    score += (union > 0 ? (intersection / union) * 100 : 0) * 0.2;

    // Lifestyle (40%)
    const factors = [
      { field: 'smoking', weight: 25 },
      { field: 'drinking', weight: 20 },
      { field: 'exerciseFrequency', weight: 15 },
      { field: 'religion', weight: 25 },
      { field: 'education', weight: 15 },
    ];
    let lifestyleScore = 100;
    factors.forEach(f => {
      if (myProfile[f.field] && theirProfile[f.field] && myProfile[f.field] !== theirProfile[f.field]) {
        lifestyleScore -= f.weight;
      }
    });
    score += Math.max(0, lifestyleScore) * 0.4;

    return Math.round(Math.min(score, 100));
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
