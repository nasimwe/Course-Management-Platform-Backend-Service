/**
 * @swagger
 * components:
 *   schemas:
 *     Module:
 *       type: object
 *       required:
 *         - code
 *         - name
 *         - credits
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the module
 *         code:
 *           type: string
 *           description: Unique module code (e.g., CS101)
 *         name:
 *           type: string
 *           description: Module name
 *         description:
 *           type: string
 *           description: Detailed description of the module
 *         credits:
 *           type: integer
 *           description: Number of credit hours
 *         prerequisites:
 *           type: string
 *           description: Required prerequisites
 *         department:
 *           type: string
 *           description: Department offering the module
 *         level:
 *           type: string
 *           enum: [foundation, intermediate, advanced]
 *           description: Academic level of the module
 *         isActive:
 *           type: boolean
 *           description: Whether the module is currently active
 *         maxEnrollment:
 *           type: integer
 *           description: Maximum number of students that can enroll
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
module.exports = (sequelize, DataTypes) => {
    const Module = sequelize.define('Module', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          len: {
            args: [3, 20],
            msg: 'Module code must be between 3 and 20 characters'
          },
          notEmpty: {
            msg: 'Module code is required'
          },
          is: {
            args: /^[A-Z]{2,4}[0-9]{2,4}$/,
            msg: 'Module code must follow format: 2-4 letters followed by 2-4 numbers (e.g., CS101)'
          }
        },
        set(value) {
          this.setDataValue('code', value.toUpperCase().trim());
        }
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: {
            args: [3, 150],
            msg: 'Module name must be between 3 and 150 characters'
          },
          notEmpty: {
            msg: 'Module name is required'
          }
        },
        set(value) {
          this.setDataValue('name', value.trim());
        }
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      credits: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: {
            args: 1,
            msg: 'Credits must be at least 1'
          },
          max: {
            args: 20,
            msg: 'Credits cannot exceed 20'
          }
        }
      },
      prerequisites: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      department: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: {
            args: [0, 100],
            msg: 'Department must be less than 100 characters'
          }
        }
      },
      level: {
        type: DataTypes.ENUM('foundation', 'intermediate', 'advanced'),
        defaultValue: 'foundation',
        allowNull: false,
        validate: {
          isIn: {
            args: [['foundation', 'intermediate', 'advanced']],
            msg: 'Level must be foundation, intermediate, or advanced'
          }
        }
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        field: 'isActive'
      },
      maxEnrollment: {
        type: DataTypes.INTEGER,
        defaultValue: 30,
        allowNull: false,
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
      tableName: 'modules',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['code']
        },
        {
          fields: ['department']
        },
        {
          fields: ['level']
        },
        {
          fields: ['isActive']
        }
      ]
    });
  
    // Instance methods
    Module.prototype.getFullName = function() {
      return `${this.code} - ${this.name}`;
    };
  
    Module.prototype.getCurrentEnrollment = async function() {
      const models = sequelize.models;
      const activeOfferings = await models.CourseOffering.findAll({
        where: { 
          moduleId: this.id,
          isActive: true 
        },
        include: [
          {
            model: models.Cohort,
            as: 'cohort',
            include: [
              {
                model: models.Student,
                as: 'students',
                where: { status: 'active' }
              }
            ]
          }
        ]
      });
  
      let totalEnrollment = 0;
      activeOfferings.forEach(offering => {
        if (offering.cohort && offering.cohort.students) {
          totalEnrollment += offering.cohort.students.length;
        }
      });
  
      return totalEnrollment;
    };
  
    Module.prototype.hasAvailableSpots = async function() {
      const currentEnrollment = await this.getCurrentEnrollment();
      return currentEnrollment < this.maxEnrollment;
    };
  
    Module.prototype.getAvailableSpots = async function() {
      const currentEnrollment = await this.getCurrentEnrollment();
      return Math.max(0, this.maxEnrollment - currentEnrollment);
    };
  
    Module.prototype.canAddOffering = function() {
      return this.isActive;
    };
  
    // Class methods
    Module.findByCode = function(code) {
      return this.findOne({
        where: { code: code.toUpperCase().trim() }
      });
    };
  
    Module.findByDepartment = function(department) {
      return this.findAll({
        where: { 
          department: {
            [sequelize.Sequelize.Op.like]: `%${department}%`
          }
        }
      });
    };
  
    Module.findByLevel = function(level) {
      return this.findAll({
        where: { level }
      });
    };
  
    Module.findActive = function() {
      return this.findAll({
        where: { isActive: true }
      });
    };
  
    Module.findByCredits = function(credits) {
      return this.findAll({
        where: { credits }
      });
    };
  
    Module.searchByName = function(searchTerm) {
      return this.findAll({
        where: {
          [sequelize.Sequelize.Op.or]: [
            {
              name: {
                [sequelize.Sequelize.Op.like]: `%${searchTerm}%`
              }
            },
            {
              code: {
                [sequelize.Sequelize.Op.like]: `%${searchTerm}%`
              }
            }
          ]
        }
      });
    };
  
    // Associations
    Module.associate = function(models) {
      // Module can have many CourseOfferings
      Module.hasMany(models.CourseOffering, {
        foreignKey: 'moduleId',
        as: 'offerings',
        onDelete: 'CASCADE'
      });
    };
  
    return Module;
  };