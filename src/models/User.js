const { DataTypes } = require('sequelize');

const RelationshipStatus = {
  AVAILABLE: 'available',
  MATCHED_LOCKED: 'matched_locked',
  VIDEO_CALL_COMPLETED: 'video_call_completed',
  DATE_ACCEPTED: 'date_accepted',
  POST_DATE_OPEN: 'post_date_open'
};

const SubscriptionTier = {
  FREE: 'free',
  PREMIUM: 'premium',
  GOLD: 'gold'
};

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    googleId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      field: 'google_id'
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'first_name'
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'last_name'
    },
    profilePhoto: {
      type: DataTypes.STRING,
      field: 'profile_photo'
    },
    dateOfBirth: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'date_of_birth',
      validate: {
        isDate: true,
        isBefore: new Date().toISOString()
      }
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'non-binary'),
      allowNull: false
    },
    relationshipStatus: {
      type: DataTypes.ENUM(
        RelationshipStatus.AVAILABLE,
        RelationshipStatus.MATCHED_LOCKED,
        RelationshipStatus.VIDEO_CALL_COMPLETED,
        RelationshipStatus.DATE_ACCEPTED,
        RelationshipStatus.POST_DATE_OPEN
      ),
      defaultValue: RelationshipStatus.AVAILABLE,
      field: 'relationship_status'
    },
    subscriptionTier: {
      type: DataTypes.ENUM(
        SubscriptionTier.FREE,
        SubscriptionTier.PREMIUM,
        SubscriptionTier.GOLD
      ),
      defaultValue: SubscriptionTier.FREE,
      field: 'subscription_tier'
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_email_verified'
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      field: 'email_verification_token'
    },
    emailVerificationExpires: {
      type: DataTypes.DATE,
      field: 'email_verification_expires'
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    passwordResetToken: {
      type: DataTypes.STRING,
      field: 'password_reset_token',
      allowNull: true
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      field: 'password_reset_expires',
      allowNull: true
    },
    refreshToken: {
      type: DataTypes.STRING,
      field: 'refresh_token'
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      field: 'last_login_at'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    isSuspended: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_suspended'
    },
    timezone: {
      type: DataTypes.STRING,
      defaultValue: 'UTC'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    }
  }, {
    tableName: 'users',
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        unique: true,
        fields: ['google_id']
      },
      {
        fields: ['relationship_status']
      },
      {
        fields: ['subscription_tier']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  // Instance methods
  User.prototype.toSafeObject = function() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      profilePhoto: this.profilePhoto,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender,
      relationshipStatus: this.relationshipStatus,
      subscriptionTier: this.subscriptionTier,
      isEmailVerified: this.isEmailVerified,
      timezone: this.timezone,
      latitude: this.latitude,
      longitude: this.longitude,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  };

  User.prototype.canMatch = function() {
    return this.relationshipStatus === RelationshipStatus.AVAILABLE && this.isActive;
  };

  User.prototype.canBeStolen = function() {
    return this.relationshipStatus === RelationshipStatus.POST_DATE_OPEN && this.isActive;
  };

  return User;
};
