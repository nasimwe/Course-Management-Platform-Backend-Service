/**
 * @swagger
 * components:
 *   schemas:
 *     Class:
 *       type: object
 *       required:
 *         - name
 *         - startDate
 *         - endDate
 *         - trimester
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the class
 *         name:
 *           type: string
 *           description: Class name (e.g., "2024S", "2025J")
 *         startDate:
 *           type: string
 *           format: date
 *           description: Class start date
 *         endDate:
 *           type: string
 *           format: date
 *           description: Class end date
 *         trimester:
 *           type: string
 *           enum: [T1, T2, T3]
 *           description: Trimester (T1, T2, T3)
 *         year:
 *           type: integer
 *           description: Academic year
 *         graduationDate:
 *           type: string
 *           format: date
 *           description: Expected graduation date for this class
 *         isActive:
 *           type: boolean
 *           description: Whether the class is currently active
 *         description:
 *           type: string
 *           description: Additional description
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
module.exports = (sequelize, DataTypes) => {
  const Class = sequelize.define('Class', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: {
          args: [3, 20],
          msg: 'Class name must be between 3 and 20 characters'
        },
        notEmpty: {
          msg: 'Class name is required'
        },
        is: {
          args: /^[0-9]{4}[A-Z]$/,
          msg: 'Class name must follow format: 4 digits followed by 1 letter (e.g., 2024S)'
        }
      },
      set(value) {
        this.setDataValue('name', value.toUpperCase().trim());
      }
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'startDate', 
      validate: {
        isDate: {
          msg: 'Please provide a valid start date'
        },
        notEmpty: {
          msg: 'Start date is required'
        }
      }
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'endDate', 
      validate: {
        isDate: {
          msg: 'Please provide a valid end date'
        },
        notEmpty: {
          msg: 'End date is required'
        },
        isAfterStartDate(value) {
          if (value <= this.startDate) {
            throw new Error('End date must be after start date');
          }
        }
      }
    },
    trimester: {
      type: DataTypes.ENUM('T1', 'T2', 'T3'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['T1', 'T2', 'T3']],
          msg: 'Trimester must be T1, T2, or T3'
        }
      }
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: 2020,
          msg: 'Year must be 2020 or later'
        },
        max: {
          args: 2050,
          msg: 'Year cannot exceed 2050'
        }
      }
    },
    graduationDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'graduationDate', // Explicitly map to the column name
      validate: {
        isDate: {
          msg: 'Please provide a valid graduation date'
        },
        isAfterEndDate(value) {
          if (value && this.endDate && value <= this.endDate) {
            throw new Error('Graduation date must be after class end date');
          }
        }
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'isActive' 
    },
    description: {
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
    tableName: 'classes',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['name'] },
      { fields: ['year'] },
      { fields: ['trimester'] },
      { fields: ['isActive'] },
      { fields: ['startDate'] }
    ],
    hooks: {
      beforeSave: async (classInstance) => {
        // Auto-extract year from name if not provided
        if (!classInstance.year && classInstance.name) {
          const yearMatch = classInstance.name.match(/^(\d{4})/);
          if (yearMatch) {
            classInstance.year = parseInt(yearMatch[1]);
          }
        }
      }
    }
  });
  
    // Instance methods
    Class.prototype.getDuration = function() {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };
  
    Class.prototype.getDurationInWeeks = function() {
      return Math.ceil(this.getDuration() / 7);
    };
  
    Class.prototype.isCurrentlyActive = function() {
      const today = new Date();
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      return this.isActive && today >= start && today <= end;
    };
  
    Class.prototype.hasStarted = function() {
      const today = new Date();
      const start = new Date(this.startDate);
      return today >= start;
    };
  
    Class.prototype.hasEnded = function() {
      const today = new Date();
      const end = new Date(this.endDate);
      return today > end;
    };
  
    Class.prototype.getStatus = function() {
      if (!this.isActive) return 'inactive';
      if (!this.hasStarted()) return 'upcoming';
      if (this.hasEnded()) return 'completed';
      return 'active';
    };
  
    Class.prototype.getTrimesterInfo = function() {
      const trimesterMap = {
        'T1': { name: 'First Trimester', season: 'Spring' },
        'T2': { name: 'Second Trimester', season: 'Summer' },
        'T3': { name: 'Third Trimester', season: 'Fall' }
      };
      return trimesterMap[this.trimester] || { name: 'Unknown', season: 'Unknown' };
    };
  
    Class.prototype.getFullName = function() {
      const trimesterInfo = this.getTrimesterInfo();
      return `${this.name} - ${trimesterInfo.name} ${this.year}`;
    };
  
    Class.prototype.getCurrentWeek = function() {
      if (!this.hasStarted()) return 0;
      if (this.hasEnded()) return this.getDurationInWeeks();
      
      const today = new Date();
      const start = new Date(this.startDate);
      const diffTime = today - start;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return Math.floor(diffDays / 7) + 1;
    };
  
    // Class methods
    Class.findByName = function(name) {
      return this.findOne({
        where: { name: name.toUpperCase().trim() }
      });
    };
  
    Class.findByYear = function(year) {
      return this.findAll({
        where: { year },
        order: [['trimester', 'ASC']]
      });
    };
  
    Class.findByTrimester = function(trimester) {
      return this.findAll({
        where: { trimester },
        order: [['year', 'DESC']]
      });
    };
  
    Class.findActive = function() {
      return this.findAll({
        where: { isActive: true },
        order: [['year', 'DESC'], ['trimester', 'ASC']]
      });
    };
  
    Class.findCurrent = function() {
      const today = new Date().toISOString().split('T')[0];
      return this.findAll({
        where: {
          isActive: true,
          startDate: {
            [sequelize.Sequelize.Op.lte]: today
          },
          endDate: {
            [sequelize.Sequelize.Op.gte]: today
          }
        }
      });
    };
  
    Class.findUpcoming = function() {
      const today = new Date().toISOString().split('T')[0];
      return this.findAll({
        where: {
          isActive: true,
          startDate: {
            [sequelize.Sequelize.Op.gt]: today
          }
        },
        order: [['startDate', 'ASC']]
      });
    };
  
    Class.findCompleted = function() {
      const today = new Date().toISOString().split('T')[0];
      return this.findAll({
        where: {
          endDate: {
            [sequelize.Sequelize.Op.lt]: today
          }
        },
        order: [['endDate', 'DESC']]
      });
    };
  
    Class.findByYearAndTrimester = function(year, trimester) {
      return this.findOne({
        where: { year, trimester }
      });
    };
  
    // Associations
    Class.associate = function(models) {
      // Class can have many CourseOfferings
      Class.hasMany(models.CourseOffering, {
        foreignKey: 'classId',
        as: 'courseOfferings',
        onDelete: 'CASCADE'
      });
    };
  
    return Class;
  };