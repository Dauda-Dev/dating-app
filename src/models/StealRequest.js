module.exports = (sequelize, DataTypes) => {
  const StealRequest = sequelize.define('StealRequest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    requesterId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'requester_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    targetUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'target_user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    currentMatchId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'current_match_id',
      references: {
        model: 'matches',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'expired'),
      defaultValue: 'pending'
    },
    respondedAt: {
      type: DataTypes.DATE,
      field: 'responded_at'
    },
    expiresAt: {
      type: DataTypes.DATE,
      field: 'expires_at'
    }
  }, {
    tableName: 'steal_requests',
    indexes: [
      {
        fields: ['requester_id']
      },
      {
        fields: ['target_user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['expires_at']
      }
    ]
  });

  return StealRequest;
};
