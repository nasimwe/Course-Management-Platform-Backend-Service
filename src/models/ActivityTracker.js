/**
 * @swagger
 * components:
 *   schemas:
 *     ActivityTracker:
 *       type: object
 *       required:
 *         - allocationId
 *         - facilitatorId
 *         - weekNumber
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the activity tracker
 *         allocationId:
 *           type: integer
 *           description: Reference to the CourseOffering id
 *         facilitatorId:
 *           type: integer
 *           description: Reference to the Facilitator id
 *         weekNumber:
 *           type: integer
 *           description: Week number (1-20)
 *         attendance:
 *           type: array
 *           items:
 *             type: boolean
 *           description: Array of attendance status for each day
 *         formativeOneGrading:
 *           type: string
 *           enum: [Done, Pending, Not Started]
 *           description: Status of formative assessment 1 grading
 *         formativeTwoGrading:
 *           type: string
 *           enum: [Done, Pending, Not Started]
 *           description: Status of formative assessment 2 grading
 *         summativeGrading:
 *           type: string
 *           enum: [Done, Pending, Not Started]
 *           description: Status of summative assessment grading
 *         courseModeration:
 *           type: string
 *           enum: [Done, Pending, Not Started]
 *           description: Status of course moderation
 *         intranetSync:
 *           type: string
 *           enum: [Done, Pending, Not Started]
 *           description: Status of intranet synchronization
 *         gradeBookStatus:
 *           type: string
 *           enum: [Done, Pending, Not Started]
 *           description: Status of gradebook updates
 *         notes:
 *           type: string
 *           description: Additional notes for the week
 *         submittedAt:
 *           type: string
 *           format: date-time
 *           description: When the log was submitted
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
module.exports = (sequelize, DataTypes) => {
    const ActivityTracker = sequelize.define('ActivityTracker', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      allocationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'allocationId',
        references: {
          model: 'course_offerings',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      facilitatorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'facilitatorId',
        references: {
          model: 'facilitators',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      weekNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'weekNumber',
        validate: {
          max: {
            args: 20,
            msg: 'Week number cannot exceed 20'
          }
        }
      },
      attendance: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [false, false, false, false, false], // Monday to Friday
        validate: {
          isValidAttendance(value) {
            if (value && !Array.isArray(value)) {
              throw new Error('Attendance must be an array');
            }
            if (value && value.length > 7) {
              throw new Error('Attendance array cannot have more than 7 days');
            }
            if (value && !value.every(item => typeof item === 'boolean')) {
              throw new Error('All attendance values must be boolean');
            }
          }
        }
      },
      formativeOneGrading: {
        type: DataTypes.ENUM('Done', 'Pending', 'Not Started'),
        defaultValue: 'Not Started',
        field: 'formativeOneGrading',
        allowNull: false,
        validate: {
          isIn: {
            args: [['Done', 'Pending', 'Not Started']],
            msg: 'Formative One Grading must be Done, Pending, or Not Started'
          }
        }
      },
      formativeTwoGrading: {
        type: DataTypes.ENUM('Done', 'Pending', 'Not Started'),
        defaultValue: 'Not Started',
        field: 'formativeTwoGrading',
        allowNull: false,
        validate: {
          isIn: {
            args: [['Done', 'Pending', 'Not Started']],
            msg: 'Formative Two Grading must be Done, Pending, or Not Started'
          }
        }
      },
      summativeGrading: {
        type: DataTypes.ENUM('Done', 'Pending', 'Not Started'),
        defaultValue: 'Not Started',
        field: 'summativeGrading',
        allowNull: false,
        validate: {
          isIn: {
            args: [['Done', 'Pending', 'Not Started']],
            msg: 'Summative Grading must be Done, Pending, or Not Started'
          }
        }
      },
      courseModeration: {
        type: DataTypes.ENUM('Done', 'Pending', 'Not Started'),
        defaultValue: 'Not Started',
        field: 'courseModeration',
        allowNull: false,
        validate: {
          isIn: {
            args: [['Done', 'Pending', 'Not Started']],
            msg: 'Course Moderation must be Done, Pending, or Not Started'
          }
        }
      },
      intranetSync: {
        type: DataTypes.ENUM('Done', 'Pending', 'Not Started'),
        defaultValue: 'Not Started',
        field: 'intranetSync',
        allowNull: false,
        validate: {
          isIn: {
            args: [['Done', 'Pending', 'Not Started']],
            msg: 'Intranet Sync must be Done, Pending, or Not Started'
          }
        }
      },
      gradeBookStatus: {
        type: DataTypes.ENUM('Done', 'Pending', 'Not Started'),
        defaultValue: 'Not Started',
        field: 'gradeBookStatus',
        allowNull: false,
        validate: {
          isIn: {
            args: [['Done', 'Pending', 'Not Started']],
            msg: 'Grade Book Status must be Done, Pending, or Not Started'
          }
        }
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      submittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'submittedAt'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'createdAt' 
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updatedAt' 
      }
    }, {
      tableName: 'activity_trackers',
      timestamps: true,
      indexes: [
        {
          fields: ['allocationId']
        },
        {
          fields: ['facilitatorId']
        },
        {
          fields: ['weekNumber']
        },
        {
          unique: true,
          fields: ['allocationId', 'weekNumber'],
          name: 'unique_allocation_week'
        },
        {
          fields: ['submittedAt']
        }
      ]
    });
  
    // Instance methods
    ActivityTracker.prototype.getOverallProgress = function() {
      const tasks = [
        this.formativeOneGrading,
        this.formativeTwoGrading,
        this.summativeGrading,
        this.courseModeration,
        this.intranetSync,
        this.gradeBookStatus
      ];
  
      const completed = tasks.filter(task => task === 'Done').length;
      const pending = tasks.filter(task => task === 'Pending').length;
      const notStarted = tasks.filter(task => task === 'Not Started').length;
  
      return {
        completed,
        pending,
        notStarted,
        total: tasks.length,
        completionPercentage: (completed / tasks.length) * 100
      };
    };
  
    ActivityTracker.prototype.getAttendanceRate = function() {
      if (!this.attendance || this.attendance.length === 0) return 0;
      const presentDays = this.attendance.filter(day => day === true).length;
      return (presentDays / this.attendance.length) * 100;
    };
  
    ActivityTracker.prototype.getTotalAttendanceDays = function() {
      if (!this.attendance) return 0;
      return this.attendance.filter(day => day === true).length;
    };
  
    ActivityTracker.prototype.isFullyCompleted = function() {
      const progress = this.getOverallProgress();
      return progress.completed === progress.total;
    };
  
    ActivityTracker.prototype.hasPendingTasks = function() {
      const progress = this.getOverallProgress();
      return progress.pending > 0;
    };
  
    ActivityTracker.prototype.isOverdue = function() {
      if (this.submittedAt) return false; // Already submitted
      
      // Assume deadline is end of week + 2 days grace period
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (this.weekNumber - 1) * 7);
      const deadline = new Date(weekStart);
      deadline.setDate(deadline.getDate() + 9); // End of week + 2 days
      
      return new Date() > deadline;
    };
  
    ActivityTracker.prototype.getDeadline = function() {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (this.weekNumber - 1) * 7);
      const deadline = new Date(weekStart);
      deadline.setDate(deadline.getDate() + 9); // End of week + 2 days
      return deadline;
    };
  
    ActivityTracker.prototype.submit = async function() {
      this.submittedAt = new Date();
      await this.save();
      return this;
    };
  
    ActivityTracker.prototype.getTaskStatus = function(taskName) {
      const validTasks = [
        'formativeOneGrading',
        'formativeTwoGrading', 
        'summativeGrading',
        'courseModeration',
        'intranetSync',
        'gradeBookStatus'
      ];
      
      if (!validTasks.includes(taskName)) {
        throw new Error(`Invalid task name: ${taskName}`);
      }
      
      return this[taskName];
    };
  
    ActivityTracker.prototype.updateTaskStatus = async function(taskName, status) {
      const validTasks = [
        'formativeOneGrading',
        'formativeTwoGrading',
        'summativeGrading',
        'courseModeration',
        'intranetSync',
        'gradeBookStatus'
      ];
      
      const validStatuses = ['Done', 'Pending', 'Not Started'];
      
      if (!validTasks.includes(taskName)) {
        throw new Error(`Invalid task name: ${taskName}`);
      }
      
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }
      
      this[taskName] = status;
      await this.save();
      return this;
    };
  
    // Class methods
    ActivityTracker.findByAllocation = function(allocationId) {
      return this.findAll({
        where: { allocationId },
        include: ['allocation', 'facilitator'],
        order: [['weekNumber', 'ASC']]
      });
    };
  
    ActivityTracker.findByFacilitator = function(facilitatorId) {
      return this.findAll({
        where: { facilitatorId },
        include: ['allocation', 'facilitator'],
        order: [['weekNumber', 'ASC']]
      });
    };
  
    ActivityTracker.findByWeek = function(weekNumber) {
      return this.findAll({
        where: { weekNumber },
        include: ['allocation', 'facilitator'],
        order: [['createdAt', 'DESC']]
      });
    };
  
    ActivityTracker.findOverdue = function() {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 16); // Current week + 2 days grace period
      
      return this.findAll({
        where: {
          submittedAt: null,
          createdAt: {
            [sequelize.Sequelize.Op.lt]: twoWeeksAgo
          }
        },
        include: ['allocation', 'facilitator']
      });
    };
  
    ActivityTracker.findPendingSubmission = function() {
      return this.findAll({
        where: { submittedAt: null },
        include: ['allocation', 'facilitator'],
        order: [['weekNumber', 'ASC']]
      });
    };
  
    ActivityTracker.findByTaskStatus = function(taskName, status) {
      const whereClause = {};
      whereClause[taskName] = status;
      
      return this.findAll({
        where: whereClause,
        include: ['allocation', 'facilitator']
      });
    };
  
    ActivityTracker.findIncomplete = function() {
      return this.findAll({
        where: {
          [sequelize.Sequelize.Op.or]: [
            { formativeOneGrading: { [sequelize.Sequelize.Op.ne]: 'Done' } },
            { formativeTwoGrading: { [sequelize.Sequelize.Op.ne]: 'Done' } },
            { summativeGrading: { [sequelize.Sequelize.Op.ne]: 'Done' } },
            { courseModeration: { [sequelize.Sequelize.Op.ne]: 'Done' } },
            { intranetSync: { [sequelize.Sequelize.Op.ne]: 'Done' } },
            { gradeBookStatus: { [sequelize.Sequelize.Op.ne]: 'Done' } }
          ]
        },
        include: ['allocation', 'facilitator']
      });
    };
  
    ActivityTracker.findWithFilters = function(filters = {}) {
      const whereClause = {};
      const include = ['allocation', 'facilitator'];
  
      if (filters.allocationId) whereClause.allocationId = filters.allocationId;
      if (filters.facilitatorId) whereClause.facilitatorId = filters.facilitatorId;
      if (filters.weekNumber) whereClause.weekNumber = filters.weekNumber;
      if (filters.isSubmitted !== undefined) {
        whereClause.submittedAt = filters.isSubmitted ? 
          { [sequelize.Sequelize.Op.ne]: null } : 
          { [sequelize.Sequelize.Op.eq]: null };
      }
  
      // Task status filters
      const taskFields = [
        'formativeOneGrading',
        'formativeTwoGrading',
        'summativeGrading', 
        'courseModeration',
        'intranetSync',
        'gradeBookStatus'
      ];
  
      taskFields.forEach(field => {
        if (filters[field]) {
          whereClause[field] = filters[field];
        }
      });
  
      return this.findAll({
        where: whereClause,
        include,
        order: [['weekNumber', 'ASC'], ['createdAt', 'DESC']]
      });
    };
  
    ActivityTracker.getStatistics = async function() {
      const total = await this.count();
      const submitted = await this.count({ where: { submittedAt: { [sequelize.Sequelize.Op.ne]: null } } });
      const overdue = await this.findOverdue();
      
      const taskStats = {};
      const taskFields = [
        'formativeOneGrading',
        'formativeTwoGrading',
        'summativeGrading',
        'courseModeration', 
        'intranetSync',
        'gradeBookStatus'
      ];
  
      for (const field of taskFields) {
        taskStats[field] = {
          done: await this.count({ where: { [field]: 'Done' } }),
          pending: await this.count({ where: { [field]: 'Pending' } }),
          notStarted: await this.count({ where: { [field]: 'Not Started' } })
        };
      }
  
      return {
        total,
        submitted,
        pending: total - submitted,
        overdue: overdue.length,
        submissionRate: total > 0 ? (submitted / total) * 100 : 0,
        taskStats
      };
    };
  
    // Associations
    ActivityTracker.associate = function(models) {
      // ActivityTracker belongs to CourseOffering
      ActivityTracker.belongsTo(models.CourseOffering, {
        foreignKey: 'allocationId',
        as: 'allocation',
        onDelete: 'CASCADE'
      });
  
      // ActivityTracker belongs to Facilitator
      ActivityTracker.belongsTo(models.Facilitator, {
        foreignKey: 'facilitatorId',
        as: 'facilitator',
        onDelete: 'CASCADE'
      });
    };
  
    return ActivityTracker;
  };