'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('modules', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      credits: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      prerequisites: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      department: {
        type: Sequelize.STRING,
        allowNull: true
      },
      level: {
        type: Sequelize.ENUM('foundation', 'intermediate', 'advanced'),
        defaultValue: 'foundation',
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      maxEnrollment: {
        type: Sequelize.INTEGER,
        defaultValue: 30,
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
        { unique: true, fields: ['code'] },
        { fields: ['department'] },
        { fields: ['level'] },
        { fields: ['isActive'] }
      ]
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('modules');
  }
};