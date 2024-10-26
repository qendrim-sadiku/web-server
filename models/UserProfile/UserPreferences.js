// models/UserPreferences.js

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const UserPreferences = sequelize.define('UserPreferences', {
  twoFactorAuthentication: {
    type: DataTypes.BOOLEAN,
    defaultValue: false, // By default, two-factor authentication is disabled
  },
  emailNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true, // By default, email notifications are enabled
  },
  notifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true, // By default, notifications are enabled
    comment: 'General notifications preference',
  },
  deviceLocation: {
    type: DataTypes.BOOLEAN,
    defaultValue: false, // Optional preference field
  },
  liveLocation: {
    type: DataTypes.BOOLEAN,
    defaultValue: false, // Optional preference field
  },
  appearance: {
    type: DataTypes.ENUM('light', 'dark'),
    defaultValue: 'light', // Default appearance is light
    allowNull: false,
  },
  communicationMethod: {
    type: DataTypes.ENUM('call', 'text', 'both'),
    defaultValue: 'text', // Default communication method is text
    allowNull: false,
    comment: 'Preferred method of communication',
  },
  UserId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users', // Ensure that 'Users' matches the name of your Users table
      key: 'id',
    },
    allowNull: false, // User ID is required to associate preferences with the user
  },
}, {
  timestamps: true, // Keep track of when preferences are updated
  tableName: 'UserPreferences', // Optional: Specify the table name explicitly
});

module.exports = UserPreferences;
