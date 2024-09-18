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
    type: DataTypes.JSON,
    allowNull: true,
  },
  whatsIncluded: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  whatsNotIncluded: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  recommendations: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  whatsToBring: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  coachInfo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  serviceImage: {
    type: DataTypes.JSON, // Store images as an array of URLs or file paths
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = ServiceDetails;
