const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const { Service } = require('./Service');

const ServiceDetails = sequelize.define('ServiceDetails', {
  serviceId: {
    type: DataTypes.INTEGER,
    references: {
      model: Service,
      key: 'id',
    },
    allowNull: false,
  },
  fullDescription: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  highlights: {
    type: DataTypes.JSON, // Store highlights as JSON
    allowNull: true,
  },
  whatsIncluded: {
    type: DataTypes.JSON, // Store what's included as JSON
    allowNull: true,
  },
  whatsNotIncluded: {
    type: DataTypes.JSON, // Store what's not included as JSON
    allowNull: true,
  },
  recommendations: {
    type: DataTypes.JSON, // Store recommendations as JSON
    allowNull: true,
  },
  whatsToBring: {
    type: DataTypes.JSON, // Store what to bring as JSON
    allowNull: true,
  },
  coachInfo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = ServiceDetails;
