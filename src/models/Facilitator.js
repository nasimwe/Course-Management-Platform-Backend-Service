'use strict';

module.exports = (sequelize, DataTypes) => {
  const Facilitator = sequelize.define('Facilitator', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'id'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'userId'
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'employeeId'
    },
    specialization: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'specialization'
    },
    qualification: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'qualification'
    },
    experience: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'experience'
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'phoneNumber'
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'isAvailable'
    },
    maxCourseLoad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      field: 'maxCourseLoad'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      allowNull: false,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      allowNull: false,
      field: 'updatedAt'
    }
  }, {
    tableName: 'facilitators',
    timestamps: true,
    underscored: false
  });

  // Associations
  Facilitator.associate = function(models) {
    Facilitator.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

   // Instance methods
   Facilitator.prototype.getCurrentCourseLoad = async function() {
    const models = sequelize.models;
    const activeCourses = await models.CourseOffering.count({
      where: { 
        facilitatorId: this.id,
        isActive: true 
      }
    });
    return activeCourses;
  };

  Facilitator.prototype.canTakeMoreCourses = async function() {
    const currentLoad = await this.getCurrentCourseLoad();
    return this.isAvailable && currentLoad < this.maxCourseLoad;
  };

  Facilitator.prototype.getAvailabilityStatus = async function() {
    const currentLoad = await this.getCurrentCourseLoad();
    const percentage = (currentLoad / this.maxCourseLoad) * 100;
    
    if (percentage === 0) return 'available';
    if (percentage < 50) return 'light';
    if (percentage < 80) return 'moderate';
    if (percentage < 100) return 'heavy';
    return 'full';
  };

  // Class methods
  Facilitator.findByEmployeeId = function(employeeId) {
    return this.findOne({
      where: { employeeId },
      include: ['user']
    });
  };

  Facilitator.findBySpecialization = function(specialization) {
    return this.findAll({
      where: { 
        specialization: {
          [sequelize.Sequelize.Op.like]: `%${specialization}%`
        }
      },
      include: ['user']
    });
  };

  Facilitator.findAvailable = function() {
    return this.findAll({
      where: { isAvailable: true },
      include: ['user']
    });
  };

  Facilitator.findWithLightLoad = async function() {
    const facilitators = await this.findAll({
      where: { isAvailable: true },
      include: ['user', 'courseOfferings']
    });

    const lightLoadFacilitators = [];
    for (const facilitator of facilitators) {
      const currentLoad = await facilitator.getCurrentCourseLoad();
      if (currentLoad < facilitator.maxCourseLoad * 0.7) {
        lightLoadFacilitators.push(facilitator);
      }
    }
    return lightLoadFacilitators;
  };

  // Associations
  Facilitator.associate = function(models) {
    // Facilitator belongs to User
    Facilitator.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE'
    });

    // Facilitator can have many CourseOfferings
    Facilitator.hasMany(models.CourseOffering, {
      foreignKey: 'facilitatorId',
      as: 'courseOfferings',
      onDelete: 'SET NULL'
    });

    // Facilitator can have many ActivityTrackers
    Facilitator.hasMany(models.ActivityTracker, {
      foreignKey: 'facilitatorId',
      as: 'activityLogs',
      onDelete: 'CASCADE'
    });
  };

  return Facilitator;
};