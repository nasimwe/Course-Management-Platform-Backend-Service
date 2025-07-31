const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Initialize Sequelize
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig
);

// Import models
const User = require('./User')(sequelize, Sequelize.DataTypes);
const Manager = require('./Manager')(sequelize, Sequelize.DataTypes);
const Facilitator = require('./Facilitator')(sequelize, Sequelize.DataTypes);
const Student = require('./Student')(sequelize, Sequelize.DataTypes);
const Module = require('./Module')(sequelize, Sequelize.DataTypes);
const Cohort = require('./Cohort')(sequelize, Sequelize.DataTypes);
const Class = require('./Class')(sequelize, Sequelize.DataTypes);
const Mode = require('./Mode')(sequelize, Sequelize.DataTypes);
const CourseOffering = require('./CourseOffering')(sequelize, Sequelize.DataTypes);
const ActivityTracker = require('./ActivityTracker')(sequelize, Sequelize.DataTypes);

// Store models in db object
const db = {
  sequelize,
  Sequelize,
  User,
  Manager,
  Facilitator,
  Student,
  Module,
  Cohort,
  Class,
  Mode,
  CourseOffering,
  ActivityTracker,
  DataTypes
};

// Define associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;