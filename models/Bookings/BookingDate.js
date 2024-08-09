const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const Booking = require('./Booking');

const BookingDate = sequelize.define('BookingDate', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  bookingId: {
    type: DataTypes.INTEGER,
    references: {
      model: Booking,
      key: 'id'
    },
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false
  }
}, {
  timestamps: true
});

Booking.hasMany(BookingDate, { foreignKey: 'bookingId' });
BookingDate.belongsTo(Booking, { foreignKey: 'bookingId' });

module.exports = BookingDate;
