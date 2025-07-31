'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('managers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      department: {
        type: Sequelize.STRING,
        allowNull: false
      },
      employeeId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      accessLevel: {
        type: Sequelize.ENUM('standard', 'senior', 'admin'),
        defaultValue: 'standard',
        allowNull: false
      },
      phoneNumber: {
        type: Sequelize.STRING,
        allowNull: true
      },
      office: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, {
      indexes: [
        { unique: true, fields: ['employeeId'] },
        { fields: ['department'] },
        { fields: ['accessLevel'] }
      ]
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('managers');
  }
};