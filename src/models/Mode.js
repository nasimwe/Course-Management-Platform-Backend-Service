/**
 * @swagger
 * components:
 *   schemas:
 *     Mode:
 *       type: object
 *       required:
 *         - name
 *         - type
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the mode
 *         name:
 *           type: string
 *           description: Mode name (e.g., "Online", "In-Person", "Hybrid")
 *         type:
 *           type: string
 *           enum: [online, in-person, hybrid]
 *           description: Type of delivery mode
 *         description:
 *           type: string
 *           description: Detailed description of the mode
 *         requirements:
 *           type: string
 *           description: Technical or physical requirements
 *         isActive:
 *           type: boolean
 *           description: Whether the mode is currently available
 *         maxCapacity:
 *           type: integer
 *           description: Maximum capacity for this mode
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
module.exports = (sequelize, DataTypes) => {
    const Mode = sequelize.define('Mode', {
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
            args: [2, 50],
            msg: 'Mode name must be between 2 and 50 characters'
          },
          notEmpty: {
            msg: 'Mode name is required'
          }
        },
        set(value) {
          this.setDataValue('name', value.trim());
        }
      },
      type: {
        type: DataTypes.ENUM('online', 'in-person', 'hybrid'),
        allowNull: false,
        validate: {
          isIn: {
            args: [['online', 'in-person', 'hybrid']],
            msg: 'Type must be online, in-person, or hybrid'
          }
        }
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      requirements: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        field: "isActive"
      },
      maxCapacity: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "maxCapacity",
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
      tableName: 'modes',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['name']
        },
        {
          fields: ['type']
        },
        {
          fields: ['isActive']
        }
      ]
    });
  
    // Instance methods
    Mode.prototype.isOnline = function() {
      return this.type === 'online';
    };
  
    Mode.prototype.isInPerson = function() {
      return this.type === 'in-person';
    };
  
    Mode.prototype.isHybrid = function() {
      return this.type === 'hybrid';
    };
  
    Mode.prototype.requiresPhysicalSpace = function() {
      return this.type === 'in-person' || this.type === 'hybrid';
    };
  
    Mode.prototype.requiresTechnology = function() {
      return this.type === 'online' || this.type === 'hybrid';
    };
  
    Mode.prototype.getCapacityInfo = function() {
      return {
        hasLimit: this.maxCapacity !== null,
        capacity: this.maxCapacity,
        isUnlimited: this.maxCapacity === null
      };
    };
  
    Mode.prototype.getCurrentUsage = async function() {
      const models = sequelize.models;
      const activeOfferings = await models.CourseOffering.count({
        where: { 
          modeId: this.id,
          isActive: true 
        }
      });
      return activeOfferings;
    };
  
    Mode.prototype.hasAvailableCapacity = async function() {
      if (this.maxCapacity === null) return true; // Unlimited capacity
      const currentUsage = await this.getCurrentUsage();
      return currentUsage < this.maxCapacity;
    };
  
    Mode.prototype.getAvailableCapacity = async function() {
      if (this.maxCapacity === null) return null; // Unlimited
      const currentUsage = await this.getCurrentUsage();
      return Math.max(0, this.maxCapacity - currentUsage);
    };
  
    // Class methods
    Mode.findByName = function(name) {
      return this.findOne({
        where: { name: name.trim() }
      });
    };
  
    Mode.findByType = function(type) {
      return this.findAll({
        where: { type }
      });
    };
  
    Mode.findActive = function() {
      return this.findAll({
        where: { isActive: true }
      });
    };
  
    Mode.findOnlineModes = function() {
      return this.findAll({
        where: { 
          type: 'online',
          isActive: true 
        }
      });
    };
  
    Mode.findInPersonModes = function() {
      return this.findAll({
        where: { 
          type: 'in-person',
          isActive: true 
        }
      });
    };
  
    Mode.findHybridModes = function() {
      return this.findAll({
        where: { 
          type: 'hybrid',
          isActive: true 
        }
      });
    };
  
    Mode.findWithCapacity = function() {
      return this.findAll({
        where: { 
          maxCapacity: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      });
    };
  
    Mode.findUnlimitedCapacity = function() {
      return this.findAll({
        where: { 
          maxCapacity: null
        }
      });
    };
  
    Mode.findAvailableModes = async function() {
      const allModes = await this.findActive();
      const availableModes = [];
      
      for (const mode of allModes) {
        const hasCapacity = await mode.hasAvailableCapacity();
        if (hasCapacity) {
          availableModes.push(mode);
        }
      }
      
      return availableModes;
    };
  
    // Associations
    Mode.associate = function(models) {
      // Mode can have many CourseOfferings
      Mode.hasMany(models.CourseOffering, {
        foreignKey: 'modeId',
        as: 'courseOfferings',
        onDelete: 'RESTRICT'
      });
    };
  
    return Mode;
  };