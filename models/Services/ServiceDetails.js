// models/Services/ServiceDetails.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const { Service } = require('./Service');

const ServiceDetails = sequelize.define('ServiceDetails', {
  serviceId: {
    type: DataTypes.INTEGER,
    references: { model: Service, key: 'id' },
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
  // ... other fields ...
  serviceImage: {
    type: DataTypes.JSON,   // now a JSON array of URLs
    allowNull: true,
    get() {
      const raw = this.getDataValue('serviceImage');
      return Array.isArray(raw) ? raw : [];
    },
    set(imgArray) {
      // ensure we always write an array
      this.setDataValue('serviceImage', Array.isArray(imgArray) ? imgArray : []);
    }
  },
}, {
  timestamps: true,
});

module.exports = ServiceDetails;
