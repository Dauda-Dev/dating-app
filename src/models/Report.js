const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Report = sequelize.define('Report', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    reporterId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'reporter_id',
    },
    reportedUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'reported_user_id',
    },
    matchId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'match_id',
    },
    reason: {
      type: DataTypes.ENUM(
        'harassment',
        'fake_profile',
        'underage',
        'spam',
        'inappropriate_content',
        'violence',
        'other'
      ),
      allowNull: false,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: { len: [0, 1000] },
    },
    status: {
      type: DataTypes.ENUM('pending', 'reviewed', 'actioned', 'dismissed'),
      defaultValue: 'pending',
    },
    adminNote: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_note',
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'reviewed_by',
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reviewed_at',
    },
  }, {
    tableName: 'reports',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['reporter_id'] },
      { fields: ['reported_user_id'] },
      { fields: ['status'] },
    ],
  });

  return Report;
};
