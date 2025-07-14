// models/Trainer/AvailabilitySlot.js
const { DataTypes } = require('sequelize');
const sequelize     = require('../../config/sequelize');
const Trainer       = require('./Trainer');

const AvailabilitySlot = sequelize.define('AvailabilitySlot', {
  id: {
    type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true
  },
  trainerId: {
    type: DataTypes.INTEGER, allowNull: false
  },
  /** e.g. 2025-02-14 */
  date: {
    type: DataTypes.DATEONLY, allowNull: false
  },
  /** HH:MM (24 h) */
  startTime: {
    type: DataTypes.STRING, allowNull: false
  },
  /** HH:MM (24 h) */
  endTime: {
    type: DataTypes.STRING, allowNull: false
  },
  /** true  ➞ ‘Break time’ tab
   *  false ➞ ‘Availability time’ tab   */
  isBreak: {
    type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false
  }
}, { indexes: [
  { fields: ['trainerId', 'date'] },            // fast day look-ups
  { fields: ['trainerId', 'date', 'isBreak'] }  // quick tab filters
] });

Trainer.hasMany(AvailabilitySlot, { foreignKey: 'trainerId' });
AvailabilitySlot.belongsTo(Trainer, { foreignKey: 'trainerId' });

module.exports = AvailabilitySlot;
