module.exports = (sequelize, DataTypes) => {
  const AdEvent = sequelize.define('AdEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'user_id',
    },
    eventType: {
      type: DataTypes.ENUM('impression', 'click', 'close', 'load_failed'),
      allowNull: false,
      field: 'event_type',
    },
    placement: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'discovery_interstitial',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  }, {
    tableName: 'ad_events',
    underscored: true,
    updatedAt: false,
    indexes: [{ fields: ['event_type'] }, { fields: ['created_at'] }],
  });

  return AdEvent;
};
