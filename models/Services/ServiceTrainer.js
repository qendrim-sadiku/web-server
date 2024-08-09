// models/Services/ServiceTrainer.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const Trainer = require('../Trainer/Trainer');
const {Service} = require('./Service');

const ServiceTrainer = sequelize.define('ServiceTrainer', {
  serviceId: {
    type: DataTypes.INTEGER,
    references: {
      model: Service,
      key: 'id'
    },
    allowNull: false
  },
  trainerId: {
    type: DataTypes.INTEGER,
    references: {
      model: Trainer,
      key: 'id'
    },
    allowNull: false
  }
});

module.exports = ServiceTrainer;
