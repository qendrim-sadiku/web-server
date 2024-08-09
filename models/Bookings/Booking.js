const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const {Service} = require('../Services/Service');
const Trainer = require('../Trainer/Trainer');


const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  trainerId: {
    type: DataTypes.INTEGER,
    references: {
      model: Trainer,
      key: 'id'
    },
    allowNull: false
  },
  serviceId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Service',
      key: 'id'
    },
    allowNull: false
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false
  },
  totalPrice: {
    type: DataTypes.FLOAT,
    allowNull: false
  }
}, {
  timestamps: true
});

Service.hasMany(Booking, { foreignKey: 'serviceId' });
Booking.belongsTo(Service, { foreignKey: 'serviceId' });

Trainer.hasMany(Booking, { foreignKey: 'trainerId' });
Booking.belongsTo(Trainer, { foreignKey: 'trainerId' });

module.exports = Booking;
