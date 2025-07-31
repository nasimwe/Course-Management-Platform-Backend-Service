'use strict';

module.exports = (sequelize, DataTypes) => {
  const Manager = sequelize.define('Manager', {
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
    department: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'department'
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'employeeId'
    },
    accessLevel: {
      type: DataTypes.ENUM('standard', 'admin'),
      allowNull: false,
      defaultValue: 'standard',
      field: 'accessLevel'
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'phoneNumber'
    },
    office: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'office'
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
    tableName: 'managers',
    timestamps: true,
    underscored: false
  });

  // Associations
  Manager.associate = function(models) {
    Manager.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

   // Instance methods
   Manager.prototype.canManageCourse = function(courseOffering) {
    // Admin managers can manage all courses
    if (this.accessLevel === 'admin') {
      return true;
    }
    
    // Senior managers can manage courses in their department
    if (this.accessLevel === 'senior') {
      return true; // You might want to add department-specific logic here
    }
    
    // Standard managers have limited access
    return this.accessLevel === 'standard';
  };

  Manager.prototype.getPermissions = function() {
    const basePermissions = ['read_course_allocations', 'read_activity_logs'];
    
    switch (this.accessLevel) {
      case 'admin':
        return [...basePermissions, 'create_course_allocations', 'update_course_allocations', 
                'delete_course_allocations', 'manage_all_activities', 'manage_users'];
      case 'senior':
        return [...basePermissions, 'create_course_allocations', 'update_course_allocations', 
                'manage_department_activities'];
      default:
        return [...basePermissions, 'create_course_allocations'];
    }
  };

  // Class methods
  Manager.findByEmployeeId = function(employeeId) {
    return this.findOne({
      where: { employeeId },
      include: ['user']
    });
  };

  Manager.findByDepartment = function(department) {
    return this.findAll({
      where: { department },
      include: ['user']
    });
  };

  Manager.findByAccessLevel = function(accessLevel) {
    return this.findAll({
      where: { accessLevel },
      include: ['user']
    });
  };

  // Associations
  Manager.associate = function(models) {
    // Manager belongs to User
    Manager.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE'
    });

    // Manager can manage many CourseOfferings
    Manager.hasMany(models.CourseOffering, {
      foreignKey: 'managerId',
      as: 'managedCourses',
      onDelete: 'SET NULL'
    });
  };

  return Manager;
};