/**
 * @swagger
 * components:
 *   schemas:
 *     Cohort:
 *       type: object
 *       required:
 *         - name
 *         - startDate
 *         - endDate
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the cohort
 *         name:
 *           type: string
 *           description: Cohort name (e.g., "2024 Fall Intake")
 *         code:
 *           type: string
 *           description: Unique cohort code
 *         startDate:
 *           type: string
 *           format: date
 *           description: Cohort start date
 *         endDate:
 *           type: string
 *           format: date
 *           description: Cohort end date
 *         program:
 *           type: string
 *           description: Academic program
 *         intakePeriod:
 *           type: string
 *           enum: [HT1, HT2, FT]
 *           description: Intake period (HT1, HT2, FT)
 *         maxCapacity:
 *           type: integer
 *           description: Maximum number of students
 *         currentEnrollment:
 *           type: integer
 *           description: Current number of enrolled students
 *         status:
 *           type: string
 *           enum: [planning, active, completed, cancelled]
 *           description: Cohort status
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
    const Cohort = sequelize.define('Cohort', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: {
            args: [3, 100],
            msg: 'Cohort name must be between 3 and 100 characters'
          },
          notEmpty: {
            msg: 'Cohort name is required'
          }
        },
        set(value) {
          this.setDataValue('name', value.trim());
        }
      },
      code: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
          len: {
            args: [0, 20],
            msg: 'Cohort code must be less than 20 characters'
          }
        },
        set(value) {
          if (value) {
            this.setDataValue('code', value.toUpperCase().trim());
          }
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
      program: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: {
            args: [0, 100],
            msg: 'Program must be less than 100 characters'
          }
        }
      },
      intakePeriod: {
        type: DataTypes.ENUM('HT1', 'HT2', 'FT'),
        allowNull: true,
        field: 'intakePeriod',
        validate: {
          isIn: {
            args: [['HT1', 'HT2', 'FT']],
            msg: 'Intake period must be HT1, HT2, or FT'
          }
        }
      },
      maxCapacity: {
        type: DataTypes.INTEGER,
        defaultValue: 30,
        field: 'maxCapacity',
        allowNull: false,
        validate: {
          min: {
            args: 1,
            msg: 'Maximum capacity must be at least 1'
          },
          max: {
            args: 1000,
            msg: 'Maximum capacity cannot exceed 1000'
          }
        }
      },
      currentEnrollment: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'currentEnrollment',
        allowNull: false,
        validate: {
          isNotMoreThanCapacity(value) {
            if (value > this.maxCapacity) {
              throw new Error('Current enrollment cannot exceed maximum capacity');
            }
          }
        }
      },
      status: {
        type: DataTypes.ENUM('planning', 'active', 'completed', 'cancelled'),
        defaultValue: 'planning',
        allowNull: false,
        validate: {
          isIn: {
            args: [['planning', 'active', 'completed', 'cancelled']],
            msg: 'Status must be planning, active, completed, or cancelled'
          }
        }
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
      tableName: 'cohorts',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['code'],
          where: {
            code: {
              [sequelize.Sequelize.Op.ne]: null
            }
          }
        },
        {
          fields: ['status']
        },
        {
          fields: ['intakePeriod']
        },
        {
          fields: ['startDate']
        },
        {
          fields: ['program']
        }
      ],
      hooks: {
        beforeSave: async (cohort) => {
          // Auto-generate code if not provided
          if (!cohort.code && cohort.name && cohort.startDate) {
            const year = new Date(cohort.startDate).getFullYear();
            const nameCode = cohort.name.substring(0, 3).toUpperCase();
            const intakeCode = cohort.intakePeriod || 'GEN';
            cohort.code = `${nameCode}${year}${intakeCode}`;
          }
        }
      }
    });
  
    // Instance methods
    Cohort.prototype.getDuration = function() {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };
  
    Cohort.prototype.getDurationInWeeks = function() {
      return Math.ceil(this.getDuration() / 7);
    };
  
    Cohort.prototype.getDurationInMonths = function() {
      return Math.ceil(this.getDuration() / 30);
    };
  
    Cohort.prototype.isActive = function() {
      const today = new Date();
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      return this.status === 'active' && today >= start && today <= end;
    };
  
    Cohort.prototype.hasStarted = function() {
      const today = new Date();
      const start = new Date(this.startDate);
      return today >= start;
    };
  
    Cohort.prototype.hasEnded = function() {
      const today = new Date();
      const end = new Date(this.endDate);
      return today > end;
    };
  
    Cohort.prototype.hasAvailableSpots = function() {
      return this.currentEnrollment < this.maxCapacity;
    };
  
    Cohort.prototype.getAvailableSpots = function() {
      return Math.max(0, this.maxCapacity - this.currentEnrollment);
    };
  
    Cohort.prototype.getOccupancyRate = function() {
      return (this.currentEnrollment / this.maxCapacity) * 100;
    };
  
    Cohort.prototype.updateEnrollmentCount = async function() {
      const models = sequelize.models;
      const studentCount = await models.Student.count({
        where: { 
          cohortId: this.id,
          status: 'active'
        }
      });
      this.currentEnrollment = studentCount;
      await this.save();
      return studentCount;
    };
  
    // Class methods
    Cohort.findByCode = function(code) {
      return this.findOne({
        where: { code: code.toUpperCase().trim() }
      });
    };
  
    Cohort.findByStatus = function(status) {
      return this.findAll({
        where: { status }
      });
    };
  
    Cohort.findByIntakePeriod = function(intakePeriod) {
      return this.findAll({
        where: { intakePeriod }
      });
    };
  
    Cohort.findByProgram = function(program) {
      return this.findAll({
        where: { 
          program: {
            [sequelize.Sequelize.Op.like]: `%${program}%`
          }
        }
      });
    };
  
    Cohort.findActive = function() {
      const today = new Date().toISOString().split('T')[0];
      return this.findAll({
        where: {
          status: 'active',
          startDate: {
            [sequelize.Sequelize.Op.lte]: today
          },
          endDate: {
            [sequelize.Sequelize.Op.gte]: today
          }
        }
      });
    };
  
    Cohort.findUpcoming = function() {
      const today = new Date().toISOString().split('T')[0];
      return this.findAll({
        where: {
          startDate: {
            [sequelize.Sequelize.Op.gt]: today
          }
        },
        order: [['startDate', 'ASC']]
      });
    };
  
    Cohort.findByYear = function(year) {
      return this.findAll({
        where: {
          startDate: {
            [sequelize.Sequelize.Op.between]: [`${year}-01-01`, `${year}-12-31`]
          }
        }
      });
    };
  
    // Associations
    Cohort.associate = function(models) {
      // Cohort can have many Students
      Cohort.hasMany(models.Student, {
        foreignKey: 'cohortId',
        as: 'students',
        onDelete: 'RESTRICT'
      });
  
      // Cohort can have many CourseOfferings
      Cohort.hasMany(models.CourseOffering, {
        foreignKey: 'cohortId',
        as: 'courseOfferings',
        onDelete: 'CASCADE'
      });
    };


     // Instance methods
  Cohort.prototype.getDuration = function() {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  Cohort.prototype.getDurationInWeeks = function() {
    return Math.ceil(this.getDuration() / 7);
  };

  Cohort.prototype.getDurationInMonths = function() {
    return Math.ceil(this.getDuration() / 30);
  };

  Cohort.prototype.isActive = function() {
    const today = new Date();
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    return this.status === 'active' && today >= start && today <= end;
  };

  Cohort.prototype.hasStarted = function() {
    const today = new Date();
    const start = new Date(this.startDate);
    return today >= start;
  };

  Cohort.prototype.hasEnded = function() {
    const today = new Date();
    const end = new Date(this.endDate);
    return today > end;
  };

  Cohort.prototype.hasAvailableSpots = function() {
    return this.currentEnrollment < this.maxCapacity;
  };

  Cohort.prototype.getAvailableSpots = function() {
    return Math.max(0, this.maxCapacity - this.currentEnrollment);
  };

  Cohort.prototype.getOccupancyRate = function() {
    return (this.currentEnrollment / this.maxCapacity) * 100;
  };

  Cohort.prototype.updateEnrollmentCount = async function() {
    const models = sequelize.models;
    const studentCount = await models.Student.count({
      where: { 
        cohortId: this.id,
        status: 'active'
      }
    });
    this.currentEnrollment = studentCount;
    await this.save();
    return studentCount;
  };

  // Class methods
  Cohort.findByCode = function(code) {
    return this.findOne({
      where: { code: code.toUpperCase().trim() }
    });
  };

  Cohort.findByStatus = function(status) {
    return this.findAll({
      where: { status }
    });
  };

  Cohort.findByIntakePeriod = function(intakePeriod) {
    return this.findAll({
      where: { intakePeriod }
    });
  };

  Cohort.findByProgram = function(program) {
    return this.findAll({
      where: { 
        program: {
          [sequelize.Sequelize.Op.like]: `%${program}%`
        }
      }
    });
  };

  Cohort.findActive = function() {
    const today = new Date().toISOString().split('T')[0];
    return this.findAll({
      where: {
        status: 'active',
        startDate: {
          [sequelize.Sequelize.Op.lte]: today
        },
        endDate: {
          [sequelize.Sequelize.Op.gte]: today
        }
      }
    });
  };

  Cohort.findUpcoming = function() {
    const today = new Date().toISOString().split('T')[0];
    return this.findAll({
      where: {
        startDate: {
          [sequelize.Sequelize.Op.gt]: today
        }
      },
      order: [['startDate', 'ASC']]
    });
  };

  Cohort.findByYear = function(year) {
    return this.findAll({
      where: {
        startDate: {
          [sequelize.Sequelize.Op.between]: [`${year}-01-01`, `${year}-12-31`]
        }
      }
    });
  };

  // Associations
  Cohort.associate = function(models) {
    // Cohort can have many Students
    Cohort.hasMany(models.Student, {
      foreignKey: 'cohortId',
      as: 'students',
      onDelete: 'RESTRICT'
    });

    // Cohort can have many CourseOfferings
    Cohort.hasMany(models.CourseOffering, {
      foreignKey: 'cohortId',
      as: 'courseOfferings',
      onDelete: 'CASCADE'
    });
  };
  
    return Cohort;
  };