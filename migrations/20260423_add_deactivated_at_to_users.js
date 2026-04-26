'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'deactivated_at', {
      type: Sequelize.DataTypes.DATE,
      allowNull: true,
    });

    await queryInterface.addIndex('users', ['deactivated_at']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'deactivated_at');
  },
};
