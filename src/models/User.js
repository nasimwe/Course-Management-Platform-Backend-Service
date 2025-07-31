const bcrypt = require('bcryptjs');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *         - role
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the user
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           description: User's password (hashed)
 *         firstName:
 *           type: string
 *           description: User's first name
 *         lastName:
 *           type: string
 *           description: User's last name
 *         role:
 *           type: string
 *           enum: [manager, facilitator, student]
 *           description: User's role in the system
 *         isActive:
 *           type: boolean
 *           description: Whether the user account is active
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Last login timestamp
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: { msg: 'Please provide a valid email address' }
      },
      field: 'email'
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: { args: [6], msg: 'Password must be at least 6 characters' }
      },
      field: 'password'
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'firstName'
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'lastName'
    },
    role: {
      type: DataTypes.ENUM('manager', 'facilitator', 'student'),
      allowNull: false,
      field: 'role'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'isActive'
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'lastLogin'
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
    tableName: 'users',
    timestamps: true,
    scopes: {
      withPassword: {
        attributes: { include: ['password'] }
      }
    }
  });

  // Instance methods
  User.prototype.checkPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  User.prototype.updateLastLogin = async function() {
    this.lastLogin = new Date();
    await this.save();
  };

  // Hooks
  User.beforeCreate(async (user) => {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  });

  User.beforeUpdate(async (user) => {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  });

  // Associations
  User.associate = function(models) {
    User.hasOne(models.Manager, { foreignKey: 'userId', as: 'managerProfile' });
    User.hasOne(models.Facilitator, { foreignKey: 'userId', as: 'facilitatorProfile' });
    User.hasOne(models.Student, { foreignKey: 'userId', as: 'studentProfile' });
  };

    // Instance methods
    User.prototype.checkPassword = async function(password) {
      return await bcrypt.compare(password, this.password);
    };
  
    User.prototype.getFullName = function() {
      return `${this.firstName} ${this.lastName}`;
    };
  
    User.prototype.updateLastLogin = async function() {
      this.lastLogin = new Date();
      await this.save();
    };
  
    // Class methods
    User.findByEmail = function(email) {
      return this.scope('withPassword').findOne({
        where: { email: email.toLowerCase().trim() }
      });
    };
  
    User.findActiveUsers = function() {
      return this.scope('active').findAll();
    };

  return User;
};