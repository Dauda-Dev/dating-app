const MatchStatus = {
  MATCHED_LOCKED: 'matched_locked',
  VIDEO_CALL_COMPLETED: 'video_call_completed',
  DATE_ACCEPTED: 'date_accepted',
  POST_DATE_OPEN: 'post_date_open',
  BROKEN: 'broken'
};

module.exports = (sequelize, DataTypes) => {
  const Match = sequelize.define('Match', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user1Id: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user1_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    user2Id: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user2_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM(
        MatchStatus.MATCHED_LOCKED,
        MatchStatus.VIDEO_CALL_COMPLETED,
        MatchStatus.DATE_ACCEPTED,
        MatchStatus.POST_DATE_OPEN,
        MatchStatus.BROKEN
      ),
      defaultValue: MatchStatus.MATCHED_LOCKED
    },
    lockedAt: {
      type: DataTypes.DATE,
      field: 'locked_at',
      defaultValue: DataTypes.NOW
    },
    videoCallCompletedAt: {
      type: DataTypes.DATE,
      field: 'video_call_completed_at'
    },
    dateAcceptedAt: {
      type: DataTypes.DATE,
      field: 'date_accepted_at'
    },
    dateCompletedAt: {
      type: DataTypes.DATE,
      field: 'date_completed_at'
    },
    brokenAt: {
      type: DataTypes.DATE,
      field: 'broken_at'
    },
    brokenReason: {
      type: DataTypes.STRING,
      field: 'broken_reason'
    },
    compatibilityScore: {
      type: DataTypes.INTEGER,
      field: 'compatibility_score'
    }
  }, {
    tableName: 'matches',
    indexes: [
      {
        unique: true,
        fields: ['user1_id', 'user2_id']
      },
      {
        fields: ['user1_id']
      },
      {
        fields: ['user2_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['locked_at']
      }
    ],
    validate: {
      userIdsNotEqual() {
        if (this.user1Id === this.user2Id) {
          throw new Error('User1 ID and User2 ID cannot be the same');
        }
      }
    }
  });

  // Instance methods
  Match.prototype.getOtherUser = function(currentUserId) {
    return this.user1Id === currentUserId ? this.user2Id : this.user1Id;
  };

  Match.prototype.canProgressToVideoCall = function() {
    return this.status === MatchStatus.MATCHED_LOCKED;
  };

  Match.prototype.canProgressToDate = function() {
    return this.status === MatchStatus.VIDEO_CALL_COMPLETED;
  };

  Match.prototype.canBeStolen = function() {
    return this.status === MatchStatus.POST_DATE_OPEN;
  };

  return Match;
};

module.exports.MatchStatus = MatchStatus;
