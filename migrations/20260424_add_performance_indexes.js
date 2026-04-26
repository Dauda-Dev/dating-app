'use strict';

module.exports = {
  async up(queryInterface) {
    // Users — location coordinates for geo queries
    await queryInterface.addIndex('users', ['latitude'], {
      name: 'users_latitude_idx',
      concurrently: true,
    });
    await queryInterface.addIndex('users', ['longitude'], {
      name: 'users_longitude_idx',
      concurrently: true,
    });
    await queryInterface.addIndex('users', ['latitude', 'longitude'], {
      name: 'users_lat_lon_idx',
      concurrently: true,
    });

    // Users — active/subscription queries
    await queryInterface.addIndex('users', ['is_active'], {
      name: 'users_is_active_idx',
      concurrently: true,
    });
    await queryInterface.addIndex('users', ['subscription_tier'], {
      name: 'users_subscription_tier_idx',
      concurrently: true,
    });

    // Likes — fast lookup by sender and recipient
    await queryInterface.addIndex('likes', ['from_user_id'], {
      name: 'likes_from_user_id_idx',
      concurrently: true,
    });
    await queryInterface.addIndex('likes', ['to_user_id'], {
      name: 'likes_to_user_id_idx',
      concurrently: true,
    });
    await queryInterface.addIndex('likes', ['from_user_id', 'to_user_id'], {
      name: 'likes_from_to_idx',
      unique: true,
      concurrently: true,
    });

    // Matches — fast lookup by participants
    await queryInterface.addIndex('matches', ['user1_id'], {
      name: 'matches_user1_id_idx',
      concurrently: true,
    });
    await queryInterface.addIndex('matches', ['user2_id'], {
      name: 'matches_user2_id_idx',
      concurrently: true,
    });
    await queryInterface.addIndex('matches', ['status'], {
      name: 'matches_status_idx',
      concurrently: true,
    });

    // Messages — fast chat load
    await queryInterface.addIndex('messages', ['match_id', 'created_at'], {
      name: 'messages_match_id_created_at_idx',
      concurrently: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'users_latitude_idx');
    await queryInterface.removeIndex('users', 'users_longitude_idx');
    await queryInterface.removeIndex('users', 'users_lat_lon_idx');
    await queryInterface.removeIndex('users', 'users_is_active_idx');
    await queryInterface.removeIndex('users', 'users_subscription_tier_idx');
    await queryInterface.removeIndex('likes', 'likes_from_user_id_idx');
    await queryInterface.removeIndex('likes', 'likes_to_user_id_idx');
    await queryInterface.removeIndex('likes', 'likes_from_to_idx');
    await queryInterface.removeIndex('matches', 'matches_user1_id_idx');
    await queryInterface.removeIndex('matches', 'matches_user2_id_idx');
    await queryInterface.removeIndex('matches', 'matches_status_idx');
    await queryInterface.removeIndex('messages', 'messages_match_id_created_at_idx');
  },
};
