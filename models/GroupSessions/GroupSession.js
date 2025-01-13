// models/GroupSessions/GroupSession.js

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
// Adjust the paths below as needed:
const Trainer = require('../Trainer/Trainer');
const { Service } = require('../Services/Service');

const GroupSession = sequelize.define('GroupSession', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  trainerId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  serviceId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,  // e.g. "2025-01-09"
    allowNull: false
  },
  startTime: {
    type: DataTypes.TIME,      // e.g. "09:00:00"
    allowNull: false
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  maxGroupSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10
  },
  currentEnrollment: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  pricePerPerson: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER, // Duration in minutes
    allowNull: false,
    defaultValue: 60 // Default to 1 hour
  },
   // NEW FIELD: place or address
   address: {
    type: DataTypes.STRING,  // or DataTypes.TEXT if you prefer
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'canceled', 'completed'),
    defaultValue: 'scheduled'
  }
}, {
  timestamps: true
});

// Set up associations
// "one Trainer has many GroupSessions," "one GroupSession belongs to one Trainer"
GroupSession.belongsTo(Trainer, { foreignKey: 'trainerId' });
Trainer.hasMany(GroupSession, { foreignKey: 'trainerId' });

// "one Service has many GroupSessions," "one GroupSession belongs to one Service"
GroupSession.belongsTo(Service, { foreignKey: 'serviceId' });
Service.hasMany(GroupSession, { foreignKey: 'serviceId' });

module.exports = GroupSession;
