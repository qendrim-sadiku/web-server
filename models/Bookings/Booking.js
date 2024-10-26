const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const { Service } = require('../Services/Service'); // Correct reference to Service model
const Trainer = require('../Trainer/Trainer');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  trainerId: {
    type: DataTypes.INTEGER,
    references: {
      model: Trainer, // Correct reference to the Trainer model
      key: 'id',
    },
    allowNull: false,
  },
  serviceId: {
    type: DataTypes.INTEGER,
    references: {
      model: Service, // Direct reference to the imported Service model
      key: 'id',
    },
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  totalPrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'active', // Default status for new bookings
  },
  isBookingConfirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false, // Default to false, can be updated later to true
  },
}, {
  timestamps: true,
});

// Define associations
Service.hasMany(Booking, { foreignKey: 'serviceId' });
Booking.belongsTo(Service, { foreignKey: 'serviceId' });

Trainer.hasMany(Booking, { foreignKey: 'trainerId' });
Booking.belongsTo(Trainer, { foreignKey: 'trainerId' });

module.exports = Booking;
