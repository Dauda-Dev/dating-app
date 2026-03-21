module.exports = (sequelize, DataTypes) => {
  const Like = sequelize.define('Like', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    fromUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'from_user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    toUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'to_user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    likeType: {
      type: DataTypes.ENUM('like', 'reject', 'super_like'),
      field: 'like_type',
      defaultValue: 'like'
    },
    isMutual: {
      type: DataTypes.BOOLEAN,
      field: 'is_mutual',
      defaultValue: false
    },
    matchedAt: {
      type: DataTypes.DATE,
      field: 'matched_at'
    }
  }, {
    tableName: 'likes',
    indexes: [
      {
        unique: true,
        fields: ['from_user_id', 'to_user_id']
      },
      {
        fields: ['from_user_id']
      },
      {
        fields: ['to_user_id']
      },
      {
        fields: ['is_mutual']
      }
    ],
    validate: {
      userIdsNotEqual() {
        if (this.fromUserId === this.toUserId) {
          throw new Error('User cannot like themselves');
        }
      }
    }
  });

  return Like;
};
