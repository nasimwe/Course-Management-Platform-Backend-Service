'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cohorts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      program: {
        type: Sequelize.STRING,
        allowNull: true
      },
      intakePeriod: {
        type: Sequelize.ENUM('HT1', 'HT2', 'FT'),
        allowNull: true
      },
      maxCapacity: {
        type: Sequelize.INTEGER,
        defaultValue: 30,
        allowNull: false
      },
      currentEnrollment: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('planning', 'active', 'completed', 'cancelled'),
        defaultValue: 'planning',
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
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
        {
          unique: true,
          fields: ['code'],
          where: { code: { [Sequelize.Op.ne]: null } }
        },
        { fields: ['status'] },
        { fields: ['intakePeriod'] },
        { fields: ['startDate'] },
        { fields: ['program'] }
      ]
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cohorts');
  }
};