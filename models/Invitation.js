const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize'); // Your Sequelize instance
const User = require('./User'); // Import User here if needed for relationships

const Invitation = sequelize.define('Invitation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  parentUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING, // New field to store the email of the invited user
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING, // New field to store the name of the invited user
    allowNull: true,
  },
  phoneNumber: {
    type: DataTypes.STRING, // New field to store the phone number of the invited user
    allowNull: true,
  },
  birthDate: {
    type: DataTypes.DATE, // Add birthdate to the invitation
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  usedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

// No need to define anything in the User model
module.exports = Invitation;
