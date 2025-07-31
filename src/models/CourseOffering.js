/**
 * @swagger
 * components:
 *   schemas:
 *     CourseOffering:
 *       type: object
 *       required:
 *         - moduleId
 *         - cohortId
 *         - classId
 *         - modeId
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the course offering
 *         moduleId:
 *           type: integer
 *           description: Reference to the Module id
 *         cohortId:
 *           type: integer
 *           description: Reference to the Cohort id
 *         classId:
 *           type: integer
 *           description: Reference to the Class id
 *         facilitatorId:
 *           type: integer
 *           description: Reference to the Facilitator id
 *         managerId:
 *           type: integer
 *           description: Reference to the Manager id who created this offering
 *         modeId:
 *           type: integer
 *           description: Reference to the Mode id
 *         startDate:
 *           type: string
 *           format: date
 *           description: Course offering start date
 *         endDate:
 *           type: string
 *           format: date
 *           description: Course offering end date
 *         maxEnrollment:
 *           type: integer
 *           description: Maximum number of students for this offering
 *         currentEnrollment:
 *           type: integer
 *           description: Current number of enrolled students
 *         status:
 *           type: string
 *           enum: [draft, scheduled, active, completed, cancelled]
 *           description: Current status of the offering
 *         isActive:
 *           type: boolean
 *           description: Whether the offering is active
 *         schedule:
 *           type: string
 *           description: Class schedule information
 *         location:
 *           type: string
 *           description: Physical or virtual location
 *         notes:
 *           type: string
 *           description: Additional notes
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
module.exports = (sequelize, DataTypes) => {
    const CourseOffering = sequelize.define('CourseOffering', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      moduleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'moduleId',
        references: {
          model: 'modules',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      cohortId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'cohortId',
        references: {
          model: 'cohorts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      classId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'classId',
        references: {
          model: 'classes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      facilitatorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'facilitatorId',
        references: {
          model: 'facilitators',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      managerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'managerId',
        references: {
          model: 'managers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      modeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'modeId',
        references: {
          model: 'modes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      startDate: {
        type: DataTypes.DATEONLY,
        field: 'startDate',
        allowNull: true,
        validate: {
          isDate: {
            msg: 'Please provide a valid start date'
          }
        }
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'endDate',
        validate: {
          isDate: {
            msg: 'Please provide a valid end date'
          },
          isAfterStartDate(value) {
            if (value && this.startDate && value <= this.startDate) {
              throw new Error('End date must be after start date');
            }
          }
        }
      },
      maxEnrollment: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'maxEnrollment',
        validate: {
          min: {
            args: 1,
            msg: 'Maximum enrollment must be at least 1'
          },
          max: {
            args: 500,
            msg: 'Maximum enrollment cannot exceed 500'
          }
        }
      },
      currentEnrollment: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        field: 'currentEnrollment',
      },
      status: {
        type: DataTypes.ENUM('draft', 'scheduled', 'active', 'completed', 'cancelled'),
        defaultValue: 'draft',
        allowNull: false,
        validate: {
          isIn: {
            args: [['draft', 'scheduled', 'active', 'completed', 'cancelled']],
            msg: 'Status must be draft, scheduled, active, completed, or cancelled'
          }
        }
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        field: 'isActive'
      },
      schedule: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: {
            args: [0, 200],
            msg: 'Location must be less than 200 characters'
          }
        }
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
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
      tableName: 'course_offerings',
      timestamps: true,
      indexes: [
        {
          fields: ['moduleId']
        },
        {
          fields: ['cohortId']
        },
        {
          fields: ['classId']
        },
        {
          fields: ['facilitatorId']
        },
        {
          fields: ['managerId']
        },
        {
          fields: ['modeId']
        },
        {
          fields: ['status']
        },
        {
          fields: ['isActive']
        },
        {
          unique: true,
          fields: ['moduleId', 'cohortId', 'classId'],
          name: 'unique_module_cohort_class'
        }
      ],
      hooks: {
        beforeSave: async (offering) => {
          // Auto-set dates from class if not provided
          if (!offering.startDate || !offering.endDate) {
            const models = sequelize.models;
            const classInstance = await models.Class.findByPk(offering.classId);
            if (classInstance) {
              offering.startDate = offering.startDate || classInstance.startDate;
              offering.endDate = offering.endDate || classInstance.endDate;
            }
          }
  
          // Auto-set max enrollment from module if not provided
          if (!offering.maxEnrollment) {
            const models = sequelize.models;
            const module = await models.Module.findByPk(offering.moduleId);
            if (module) {
              offering.maxEnrollment = module.maxEnrollment;
            }
          }
        }
      }
    });
  
    // Instance methods
    CourseOffering.prototype.getFullDetails = function() {
      return `${this.module?.code} - ${this.module?.name} | ${this.cohort?.name} | ${this.class?.name} | ${this.mode?.name}`;
    };
  
    CourseOffering.prototype.hasStarted = function() {
      if (!this.startDate) return false;
      const today = new Date();
      const start = new Date(this.startDate);
      return today >= start;
    };
  
    CourseOffering.prototype.hasEnded = function() {
      if (!this.endDate) return false;
      const today = new Date();
      const end = new Date(this.endDate);
      return today > end;
    };
  
    CourseOffering.prototype.isCurrentlyActive = function() {
      return this.isActive && 
             this.status === 'active' && 
             this.hasStarted() && 
             !this.hasEnded();
    };
  
    CourseOffering.prototype.canEnroll = function() {
      return this.isActive && 
             this.status === 'scheduled' && 
             this.hasAvailableSpots();
    };
  
    CourseOffering.prototype.hasAvailableSpots = function() {
      if (!this.maxEnrollment) return true;
      return this.currentEnrollment < this.maxEnrollment;
    };
  
    CourseOffering.prototype.getAvailableSpots = function() {
      if (!this.maxEnrollment) return null;
      return Math.max(0, this.maxEnrollment - this.currentEnrollment);
    };
  
    CourseOffering.prototype.getOccupancyRate = function() {
      if (!this.maxEnrollment) return 0;
      return (this.currentEnrollment / this.maxEnrollment) * 100;
    };
  
    CourseOffering.prototype.getDuration = function() {
      if (!this.startDate || !this.endDate) return null;
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      const diffTime = Math.abs(end - start);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };
  
    CourseOffering.prototype.getDurationInWeeks = function() {
      const days = this.getDuration();
      return days ? Math.ceil(days / 7) : null;
    };
  
    CourseOffering.prototype.getCurrentWeek = function() {
      if (!this.hasStarted()) return 0;
      if (this.hasEnded()) return this.getDurationInWeeks();
      
      const today = new Date();
      const start = new Date(this.startDate);
      const diffTime = today - start;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return Math.floor(diffDays / 7) + 1;
    };
  
    CourseOffering.prototype.updateEnrollmentCount = async function() {
      const models = sequelize.models;
      const studentCount = await models.Student.count({
        where: { 
          cohortId: this.cohortId,
          status: 'active'
        }
      });
      this.currentEnrollment = studentCount;
      await this.save();
      return studentCount;
    };
  
    CourseOffering.prototype.canAssignFacilitator = function(facilitator) {
      if (!facilitator) return false;
      return facilitator.isAvailable && this.status === 'draft';
    };
  
    CourseOffering.prototype.assignFacilitator = async function(facilitatorId) {
      if (this.status !== 'draft') {
        throw new Error('Can only assign facilitator to draft offerings');
      }
      this.facilitatorId = facilitatorId;
      await this.save();
      return this;
    };
  
    // Class methods
    CourseOffering.findByModule = function(moduleId) {
      return this.findAll({
        where: { moduleId },
        include: ['module', 'cohort', 'class', 'facilitator', 'manager', 'mode']
      });
    };
  
    CourseOffering.findByCohort = function(cohortId) {
      return this.findAll({
        where: { cohortId },
        include: ['module', 'cohort', 'class', 'facilitator', 'manager', 'mode']
      });
    };
  
    CourseOffering.findByClass = function(classId) {
      return this.findAll({
        where: { classId },
        include: ['module', 'cohort', 'class', 'facilitator', 'manager', 'mode']
      });
    };
  
    CourseOffering.findByFacilitator = function(facilitatorId) {
      return this.findAll({
        where: { facilitatorId },
        include: ['module', 'cohort', 'class', 'facilitator', 'manager', 'mode']
      });
    };
  
    CourseOffering.findByManager = function(managerId) {
      return this.findAll({
        where: { managerId },
        include: ['module', 'cohort', 'class', 'facilitator', 'manager', 'mode']
      });
    };
  
    CourseOffering.findByMode = function(modeId) {
      return this.findAll({
        where: { modeId },
        include: ['module', 'cohort', 'class', 'facilitator', 'manager', 'mode']
      });
    };
  
    CourseOffering.findByStatus = function(status) {
      return this.findAll({
        where: { status },
        include: ['module', 'cohort', 'class', 'facilitator', 'manager', 'mode']
      });
    };
  
    CourseOffering.findActive = function() {
      return this.findAll({
        where: { isActive: true },
        include: ['module', 'cohort', 'class', 'facilitator', 'manager', 'mode']
      });
    };
  
    CourseOffering.findCurrent = function() {
      const today = new Date().toISOString().split('T')[0];
      return this.findAll({
        where: {
          isActive: true,
          status: 'active',
          startDate: {
            [sequelize.Sequelize.Op.lte]: today
          },
          endDate: {
            [sequelize.Sequelize.Op.gte]: today
          }
        },
        include: ['module', 'cohort', 'class', 'facilitator', 'manager', 'mode']
      });
    };
  
    CourseOffering.findUnassigned = function() {
      return this.findAll({
        where: { 
          facilitatorId: null,
          isActive: true 
        },
        include: ['module', 'cohort', 'class', 'manager', 'mode']
      });
    };
  
    CourseOffering.findWithFilters = function(filters = {}) {
      const whereClause = { isActive: true };
      const include = ['module', 'cohort', 'class', 'facilitator', 'manager', 'mode'];
  
      if (filters.moduleId) whereClause.moduleId = filters.moduleId;
      if (filters.cohortId) whereClause.cohortId = filters.cohortId;
      if (filters.classId) whereClause.classId = filters.classId;
      if (filters.facilitatorId) whereClause.facilitatorId = filters.facilitatorId;
      if (filters.managerId) whereClause.managerId = filters.managerId;
      if (filters.modeId) whereClause.modeId = filters.modeId;
      if (filters.status) whereClause.status = filters.status;
  
      return this.findAll({
        where: whereClause,
        include,
        order: [['createdAt', 'DESC']]
      });
    };
  
    // Associations
    CourseOffering.associate = function(models) {
      // CourseOffering belongs to Module
      CourseOffering.belongsTo(models.Module, {
        foreignKey: 'moduleId',
        as: 'module',
        onDelete: 'CASCADE'
      });
  
      // CourseOffering belongs to Cohort
      CourseOffering.belongsTo(models.Cohort, {
        foreignKey: 'cohortId',
        as: 'cohort',
        onDelete: 'CASCADE'
      });
  
      // CourseOffering belongs to Class
      CourseOffering.belongsTo(models.Class, {
        foreignKey: 'classId',
        as: 'class',
        onDelete: 'CASCADE'
      });
  
      // CourseOffering belongs to Facilitator
      CourseOffering.belongsTo(models.Facilitator, {
        foreignKey: 'facilitatorId',
        as: 'facilitator',
        onDelete: 'SET NULL'
      });
  
      // CourseOffering belongs to Manager
      CourseOffering.belongsTo(models.Manager, {
        foreignKey: 'managerId',
        as: 'manager',
        onDelete: 'SET NULL'
      });
  
      // CourseOffering belongs to Mode
      CourseOffering.belongsTo(models.Mode, {
        foreignKey: 'modeId',
        as: 'mode',
        onDelete: 'RESTRICT'
      });
  
      // CourseOffering can have many ActivityTrackers
      CourseOffering.hasMany(models.ActivityTracker, {
        foreignKey: 'allocationId',
        as: 'activityLogs',
        onDelete: 'CASCADE'
      });
    };
  
    return CourseOffering;
  };