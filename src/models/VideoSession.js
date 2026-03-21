module.exports = (sequelize, DataTypes) => {
  const VideoSession = sequelize.define('VideoSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    matchId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'match_id',
      references: {
        model: 'matches',
        key: 'id'
      }
    },
    dailyRoomName: {
      type: DataTypes.STRING,
      field: 'daily_room_name'
    },
    dailyRoomUrl: {
      type: DataTypes.STRING,
      field: 'daily_room_url'
    },
    dailyRoomTokenUser1: {
      type: DataTypes.TEXT,
      field: 'daily_room_token_user1'
    },
    dailyRoomTokenUser2: {
      type: DataTypes.TEXT,
      field: 'daily_room_token_user2'
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'completed', 'cancelled'),
      defaultValue: 'pending'
    },
    startedAt: {
      type: DataTypes.DATE,
      field: 'started_at'
    },
    endedAt: {
      type: DataTypes.DATE,
      field: 'ended_at'
    },
    durationSeconds: {
      type: DataTypes.INTEGER,
      field: 'duration_seconds'
    }
  }, {
    tableName: 'video_sessions',
    indexes: [
      {
        fields: ['match_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['daily_room_name']
      }
    ]
  });

  return VideoSession;
};
