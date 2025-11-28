const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const ServiceAddress = sequelize.define('ServiceAddress', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  serviceId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  street: {
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  zipCode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'US'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  addressType: {
    type: DataTypes.ENUM('meeting_point', 'service_location', 'pickup_location'),
    defaultValue: 'meeting_point',
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'ServiceAddresses'
});

module.exports = ServiceAddress;
