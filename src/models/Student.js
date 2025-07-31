'use strict';

module.exports = (sequelize, DataTypes) => {
  const Student = sequelize.define('Student', {
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
    studentId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'studentId'
    },
    cohortId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'cohorts',
        key: 'id'
      },
      field: 'cohortId'
    },
    program: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'program'
    },
    yearOfStudy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'yearOfStudy'
    },
    dateOfBirth: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'dateOfBirth'
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'phoneNumber'
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'address'
    },
    emergencyContact: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'emergencyContact'
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
    tableName: 'students',
    timestamps: true,
    underscored: false
  });

  // Associations
  Student.associate = function(models) {
    Student.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Student.belongsTo(models.Cohort, { foreignKey: 'cohortId', as: 'cohort' });
  };

  // Class methods
  Student.findByStudentId = function(studentId) {
    return this.findOne({
      where: { studentId },
      include: ['user', 'cohort']
    });
  };

  Student.findByCohort = function(cohortId) {
    return this.findAll({
      where: { cohortId },
      include: ['user', 'cohort']
    });
  };

  Student.findByStatus = function(status) {
    return this.findAll({
      where: { status },
      include: ['user', 'cohort']
    });
  };

  Student.findByProgram = function(program) {
    return this.findAll({
      where: { 
        program: {
          [sequelize.Sequelize.Op.like]: `%${program}%`
        }
      },
      include: ['user', 'cohort']
    });
  };

  Student.findActiveStudents = function() {
    return this.findAll({
      where: { status: 'active' },
      include: ['user', 'cohort']
    });
  };

  // Associations
  Student.associate = function(models) {
    // Student belongs to User
    Student.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE'
    });

    // Student belongs to Cohort
    Student.belongsTo(models.Cohort, {
      foreignKey: 'cohortId',
      as: 'cohort',
      onDelete: 'RESTRICT'
    });
  };

  return Student;
};