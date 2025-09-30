const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const Booking = require('./Booking');

const BookingDate = sequelize.define('BookingDate', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  bookingId: {
    type: DataTypes.INTEGER,
    references: { model: Booking, key: 'id' },
    allowNull: false
  },

  date: { type: DataTypes.DATEONLY, allowNull: false },
  startTime: { type: DataTypes.TIME, allowNull: false },
  endTime: { type: DataTypes.TIME, allowNull: false },

  // NEW – recurrence metadata
  sourceKind: {
    type: DataTypes.ENUM('exact','rec'),
    allowNull: false,
    defaultValue: 'exact'
  },
  sourceMode: {
    type: DataTypes.ENUM('daily','weekly','monthly'),
    allowNull: true
  },
  sourceRangeStart: { type: DataTypes.DATEONLY, allowNull: true },
  sourceRangeEnd: { type: DataTypes.DATEONLY, allowNull: true },
  sourceWeekdays: { type: DataTypes.JSON, allowNull: true }, // ["MO","TU",...]
  sourceGroupId: { type: DataTypes.STRING(36), allowNull: true }
}, {
  timestamps: true
});

Booking.hasMany(BookingDate, { foreignKey: 'bookingId' });
BookingDate.belongsTo(Booking, { foreignKey: 'bookingId' });

module.exports = BookingDate;
