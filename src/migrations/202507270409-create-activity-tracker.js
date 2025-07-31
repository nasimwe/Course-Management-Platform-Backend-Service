'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('activity_trackers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      allocationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'course_offerings',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      facilitatorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'facilitators',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      weekNumber: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      attendance: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [false, false, false, false, false]
      },
      formativeOneGrading: {
        type: Sequelize.ENUM('Done', 'Pending', 'Not Started'),
        defaultValue: 'Not Started',
        allowNull: false
      },
      formativeTwoGrading: {
        type: Sequelize.ENUM('Done', 'Pending', 'Not Started'),
        defaultValue: 'Not Started',
        allowNull: false
      },
      summativeGrading: {
        type: Sequelize.ENUM('Done', 'Pending', 'Not Started'),
        defaultValue: 'Not Started',
        allowNull: false
      },
      courseModeration: {
        type: Sequelize.ENUM('Done', 'Pending', 'Not Started'),
        defaultValue: 'Not Started',
        allowNull: false
      },
      intranetSync: {
        type: Sequelize.ENUM('Done', 'Pending', 'Not Started'),
        defaultValue: 'Not Started',
        allowNull: false
      },
      gradeBookStatus: {
        type: Sequelize.ENUM('Done', 'Pending', 'Not Started'),
        defaultValue: 'Not Started',
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      submittedAt: {
        type: Sequelize.DATE,
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
        { fields: ['allocationId'] },
        { fields: ['facilitatorId'] },
        { fields: ['weekNumber'] },
        { unique: true, fields: ['allocationId', 'weekNumber'], name: 'unique_allocation_week' },
        { fields: ['submittedAt'] }
      ]
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('activity_trackers');
  }
};