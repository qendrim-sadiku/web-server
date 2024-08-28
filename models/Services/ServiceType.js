// models/Services/ServiceType.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize'); // Adjust path as needed

const ServiceType = sequelize.define('ServiceType', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING, // Service type name
    allowNull: false,
    unique: true
  },
  picture: {
    type: DataTypes.STRING, // URL or path to the picture
    allowNull: true // Allow null in case a picture isn't provided
  },
  pricePerHour: {
    type: DataTypes.FLOAT, // Price per hour for each service type
    allowNull: false
  }
}, {
  timestamps: false
});

module.exports = ServiceType;
