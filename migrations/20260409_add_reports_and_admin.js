'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add role + deactivated_at columns to users
    await queryInterface.addColumn('users', 'role', {
      type: Sequelize.DataTypes.ENUM('user', 'admin', 'moderator'),
      defaultValue: 'user',
      allowNull: false,
    });

    await queryInterface.addColumn('users', 'suspended_until', {
      type: Sequelize.DataTypes.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'suspension_reason', {
      type: Sequelize.DataTypes.TEXT,
      allowNull: true,
    });

    // Create reports table
    await queryInterface.createTable('reports', {
      id: {
        type: Sequelize.DataTypes.UUID,
        defaultValue: Sequelize.DataTypes.UUIDV4,
        primaryKey: true,
      },
      reporter_id: {
        type: Sequelize.DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      reported_user_id: {
        type: Sequelize.DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      match_id: {
        type: Sequelize.DataTypes.UUID,
        allowNull: true,
        references: { model: 'matches', key: 'id' },
        onDelete: 'SET NULL',
      },
      reason: {
        type: Sequelize.DataTypes.ENUM(
          'harassment', 'fake_profile', 'underage', 'spam',
          'inappropriate_content', 'violence', 'other'
        ),
        allowNull: false,
      },
      details: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.DataTypes.ENUM('pending', 'reviewed', 'actioned', 'dismissed'),
        defaultValue: 'pending',
      },
      admin_note: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      reviewed_by: {
        type: Sequelize.DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      reviewed_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DataTypes.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('reports', ['reporter_id']);
    await queryInterface.addIndex('reports', ['reported_user_id']);
    await queryInterface.addIndex('reports', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('reports');
    await queryInterface.removeColumn('users', 'role');
    await queryInterface.removeColumn('users', 'suspended_until');
    await queryInterface.removeColumn('users', 'suspension_reason');
  },
};
