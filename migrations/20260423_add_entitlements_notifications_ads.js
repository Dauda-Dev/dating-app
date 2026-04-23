'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'subscription_provider', {
      type: Sequelize.DataTypes.ENUM('none', 'google_play', 'apple_app_store', 'paystack'),
      allowNull: false,
      defaultValue: 'none',
    });

    await queryInterface.addColumn('users', 'subscription_status', {
      type: Sequelize.DataTypes.ENUM('inactive', 'active', 'grace_period', 'expired', 'revoked', 'cancelled'),
      allowNull: false,
      defaultValue: 'inactive',
    });

    await queryInterface.addColumn('users', 'subscription_product_id', {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'subscription_expires_at', {
      type: Sequelize.DataTypes.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'subscription_last_validated_at', {
      type: Sequelize.DataTypes.DATE,
      allowNull: true,
    });

    await queryInterface.createTable('notification_preferences', {
      id: {
        type: Sequelize.DataTypes.UUID,
        defaultValue: Sequelize.DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      push_enabled: {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      match_alerts: {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      super_like_alerts: {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      steal_request_alerts: {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      date_alerts: {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      chat_alerts: {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      video_alerts: {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      quiet_hours_start: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      quiet_hours_end: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      timezone: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.createTable('ad_events', {
      id: {
        type: Sequelize.DataTypes.UUID,
        defaultValue: Sequelize.DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      event_type: {
        type: Sequelize.DataTypes.ENUM('impression', 'click', 'close', 'load_failed'),
        allowNull: false,
      },
      placement: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
        defaultValue: 'discovery_interstitial',
      },
      metadata: {
        type: Sequelize.DataTypes.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('users', ['subscription_provider']);
    await queryInterface.addIndex('users', ['subscription_status']);
    await queryInterface.addIndex('users', ['subscription_expires_at']);

    await queryInterface.addIndex('notification_preferences', ['user_id']);
    await queryInterface.addIndex('ad_events', ['user_id']);
    await queryInterface.addIndex('ad_events', ['event_type']);
    await queryInterface.addIndex('ad_events', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ad_events');
    await queryInterface.dropTable('notification_preferences');

    await queryInterface.removeColumn('users', 'subscription_last_validated_at');
    await queryInterface.removeColumn('users', 'subscription_expires_at');
    await queryInterface.removeColumn('users', 'subscription_product_id');
    await queryInterface.removeColumn('users', 'subscription_status');
    await queryInterface.removeColumn('users', 'subscription_provider');

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_ad_events_event_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_subscription_provider";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_subscription_status";');
  },
};
