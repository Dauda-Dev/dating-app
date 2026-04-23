module.exports = (sequelize, DataTypes) => {
  const NotificationPreference = sequelize.define('NotificationPreference', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'user_id',
    },
    pushEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'push_enabled',
    },
    matchAlerts: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'match_alerts',
    },
    superLikeAlerts: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'super_like_alerts',
    },
    stealRequestAlerts: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'steal_request_alerts',
    },
    dateAlerts: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'date_alerts',
    },
    chatAlerts: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'chat_alerts',
    },
    videoAlerts: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'video_alerts',
    },
    quietHoursStart: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'quiet_hours_start',
    },
    quietHoursEnd: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'quiet_hours_end',
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    tableName: 'notification_preferences',
    underscored: true,
    indexes: [{ fields: ['user_id'], unique: true }],
  });

  return NotificationPreference;
};
