'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('course_offerings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      moduleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'modules',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      cohortId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cohorts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      classId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'classes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      facilitatorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'facilitators',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      managerId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'managers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      modeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'modes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      maxEnrollment: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      currentEnrollment: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('draft', 'scheduled', 'active', 'completed', 'cancelled'),
        defaultValue: 'draft',
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      schedule: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      location: {
        type: Sequelize.STRING,
        allowNull: true
      },
      notes: {
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
        { fields: ['moduleId'] },
        { fields: ['cohortId'] },
        { fields: ['classId'] },
        { fields: ['facilitatorId'] },
        { fields: ['managerId'] },
        { fields: ['modeId'] },
        { fields: ['status'] },
        { fields: ['isActive'] },
        { unique: true, fields: ['moduleId', 'cohortId', 'classId'], name: 'unique_module_cohort_class' }
      ]
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('course_offerings');
  }
};