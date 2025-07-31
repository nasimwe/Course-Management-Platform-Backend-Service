'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('facilitators', {
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
      employeeId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      specialization: {
        type: Sequelize.STRING,
        allowNull: false
      },
      qualification: {
        type: Sequelize.STRING,
        allowNull: true
      },
      experience: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      phoneNumber: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isAvailable: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      maxCourseLoad: {
        type: Sequelize.INTEGER,
        defaultValue: 5,
        allowNull: false
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
        { fields: ['specialization'] },
        { fields: ['isAvailable'] }
      ]
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('facilitators');
  }
};