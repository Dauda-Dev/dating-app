'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Rename old token column and add two new ones
    await queryInterface.renameColumn('video_sessions', 'daily_room_token', 'daily_room_token_user1');
    
    await queryInterface.addColumn('video_sessions', 'daily_room_token_user2', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Add index on daily_room_name for webhook lookups
    await queryInterface.addIndex('video_sessions', ['daily_room_name'], {
      name: 'video_sessions_daily_room_name_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('video_sessions', 'video_sessions_daily_room_name_idx');
    await queryInterface.removeColumn('video_sessions', 'daily_room_token_user2');
    await queryInterface.renameColumn('video_sessions', 'daily_room_token_user1', 'daily_room_token');
  }
};
