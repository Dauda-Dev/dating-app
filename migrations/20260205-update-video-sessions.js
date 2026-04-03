'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable('video_sessions');

    // Rename daily_room_token → daily_room_token_user1 only if the old column still exists
    if (tableDesc['daily_room_token'] && !tableDesc['daily_room_token_user1']) {
      await queryInterface.renameColumn('video_sessions', 'daily_room_token', 'daily_room_token_user1');
    }

    // Add daily_room_token_user2 only if it doesn't exist yet
    if (!tableDesc['daily_room_token_user2']) {
      await queryInterface.addColumn('video_sessions', 'daily_room_token_user2', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    // Add index only if it doesn't exist yet (addIndex is idempotent on most DBs but wrap to be safe)
    try {
      await queryInterface.addIndex('video_sessions', ['daily_room_name'], {
        name: 'video_sessions_daily_room_name_idx',
      });
    } catch (err) {
      if (!err.message.includes('already exists') && !err.message.includes('Duplicate')) throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try { await queryInterface.removeIndex('video_sessions', 'video_sessions_daily_room_name_idx'); } catch (_) {}
    const tableDesc = await queryInterface.describeTable('video_sessions');
    if (tableDesc['daily_room_token_user2']) {
      await queryInterface.removeColumn('video_sessions', 'daily_room_token_user2');
    }
    if (tableDesc['daily_room_token_user1'] && !tableDesc['daily_room_token']) {
      await queryInterface.renameColumn('video_sessions', 'daily_room_token_user1', 'daily_room_token');
    }
  },
};
