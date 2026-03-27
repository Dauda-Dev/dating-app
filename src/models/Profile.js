module.exports = (sequelize, DataTypes) => {
  const Profile = sequelize.define('Profile', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    // Personality traits (1-10 scale)
    personalityTraits: {
      type: DataTypes.JSONB,
      field: 'personality_traits',
      defaultValue: {
        extroversion: 5,
        agreeableness: 5,
        conscientiousness: 5,
        neuroticism: 5,
        openness: 5
      }
    },
    // Hobbies and interests
    hobbies: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    interests: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    // Lifestyle preferences
    smoking: {
      type: DataTypes.ENUM('never', 'occasionally', 'regularly'),
      defaultValue: 'never'
    },
    drinking: {
      type: DataTypes.ENUM('never', 'socially', 'regularly'),
      defaultValue: 'socially'
    },
    exerciseFrequency: {
      type: DataTypes.ENUM('never', 'rarely', 'weekly', 'daily'),
      field: 'exercise_frequency',
      defaultValue: 'weekly'
    },
    // Relationship preferences
    lookingFor: {
      type: DataTypes.ENUM('friendship', 'casual', 'serious_relationship', 'marriage'),
      field: 'looking_for'
    },
    ageRange: {
      type: DataTypes.JSONB,
      field: 'age_range',
      defaultValue: { min: 18, max: 50 }
    },
    preferredDistance: {
      type: DataTypes.INTEGER,
      field: 'preferred_distance',
      defaultValue: 50 // kilometers
    },
    // Bio and description
    bio: {
      type: DataTypes.TEXT,
      defaultValue: ''
    },
    // Education and work
    education: {
      type: DataTypes.ENUM('high_school', 'some_college', 'bachelors', 'masters', 'phd'),
      defaultValue: 'bachelors'
    },
    occupation: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    // Languages spoken
    languages: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: ['English']
    },
    // Religious beliefs
    religion: {
      type: DataTypes.ENUM('christian', 'muslim', 'jewish', 'hindu', 'buddhist', 'atheist', 'other'),
      defaultValue: 'atheist'
    },
    // Deal breakers
    dealBreakers: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      field: 'deal_breakers',
      defaultValue: []
    },
    // Photo URLs
    photos: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    // Hot takes — strong opinions or conversation starters shown to match partner
    hotTakes: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      field: 'hot_takes',
      defaultValue: []
    },
    // Profile completion percentage
    completionPercentage: {
      type: DataTypes.INTEGER,
      field: 'completion_percentage',
      defaultValue: 0
    },
    // Profile visibility and settings
    isVisible: {
      type: DataTypes.BOOLEAN,
      field: 'is_visible',
      defaultValue: true
    },
    lastActiveAt: {
      type: DataTypes.DATE,
      field: 'last_active_at',
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'profiles'
  });

  // Instance methods
  Profile.prototype.calculateCompatibility = async function(otherProfile) {
    let score = 0;
    let factors = 0;

    // Personality compatibility (40% weight)
    if (this.personalityTraits && otherProfile.personalityTraits) {
      const personalityScore = this.calculatePersonalityCompatibility(
        this.personalityTraits, 
        otherProfile.personalityTraits
      );
      score += personalityScore * 0.4;
      factors += 0.4;
    }

    // Interest overlap (20% weight)
    const interestScore = this.calculateInterestOverlap(otherProfile);
    score += interestScore * 0.2;
    factors += 0.2;

    // Lifestyle compatibility (40% weight)
    const lifestyleScore = this.calculateLifestyleCompatibility(otherProfile);
    score += lifestyleScore * 0.4;
    factors += 0.4;

    return factors > 0 ? Math.round(score / factors) : 0;
  };

  Profile.prototype.calculatePersonalityCompatibility = function(traits1, traits2) {
    const traits = ['extroversion', 'agreeableness', 'conscientiousness', 'neuroticism', 'openness'];
    let totalDifference = 0;
    
    traits.forEach(trait => {
      const diff = Math.abs(traits1[trait] - traits2[trait]);
      totalDifference += diff;
    });
    
    const avgDifference = totalDifference / traits.length;
    return Math.max(0, 100 - (avgDifference * 10));
  };

  Profile.prototype.calculateInterestOverlap = function(otherProfile) {
    const ourInterests = new Set([...this.hobbies, ...this.interests]);
    const theirInterests = new Set([...otherProfile.hobbies, ...otherProfile.interests]);
    
    const intersection = new Set([...ourInterests].filter(x => theirInterests.has(x)));
    const union = new Set([...ourInterests, ...theirInterests]);
    
    return union.size > 0 ? Math.round((intersection.size / union.size) * 100) : 0;
  };

  Profile.prototype.calculateLifestyleCompatibility = function(otherProfile) {
    let score = 100;
    
    const factors = [
      { field: 'smoking', weight: 25 },
      { field: 'drinking', weight: 20 },
      { field: 'exerciseFrequency', weight: 15 },
      { field: 'religion', weight: 25 },
      { field: 'education', weight: 15 }
    ];
    
    factors.forEach(factor => {
      if (this[factor.field] !== otherProfile[factor.field]) {
        score -= factor.weight;
      }
    });
    
    return Math.max(0, score);
  };

  Profile.prototype.updateCompletionPercentage = function() {
    let completed = 0;
    let total = 0;
    
    const requiredFields = ['bio', 'personalityTraits'];
    requiredFields.forEach(field => {
      total++;
      if (this[field] && (Array.isArray(this[field]) ? this[field].length > 0 : true)) {
        completed++;
      }
    });
    
    const optionalFields = [
      { field: 'hobbies', weight: 1 },
      { field: 'interests', weight: 1 },
      { field: 'education', weight: 1 },
      { field: 'occupation', weight: 1 },
      { field: 'languages', weight: 1 },
      { field: 'photos', weight: 2 }
    ];
    
    optionalFields.forEach(({ field, weight }) => {
      total += weight;
      if (this[field] && (Array.isArray(this[field]) ? this[field].length > 0 : this[field] !== '')) {
        completed += weight;
      }
    });
    
    this.completionPercentage = Math.round((completed / total) * 100);
    return this.completionPercentage;
  };

  return Profile;
};
