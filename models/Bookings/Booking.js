const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const { Service } = require('../Services/Service'); // Correct reference to Service model
const Trainer = require('../Trainer/Trainer');
const GroupSession = require('../GroupSessions/GroupSession'); 

const Booking = sequelize.define('Booking', {
  // Existing fields
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
      model: Trainer,
      key: 'id',
    },
    allowNull: false,
  },
  serviceId: {
    type: DataTypes.INTEGER,
    references: {
      model: Service,
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
    defaultValue: 'active',
  },
  groupSessionId: {
    type: DataTypes.INTEGER,
    allowNull: true, // null means it's a private (one-on-one) session
    references: {
      model: GroupSession,
      key: 'id'
    }
  },
  isBookingConfirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  rating: {
    type: DataTypes.INTEGER, // Rating on a scale (e.g., 1-5)
    allowNull: true,
    validate: { min: 1, max: 5 },
  },
  review: {
    type: DataTypes.TEXT, // User's optional text feedback
    allowNull: true,
  },
}, {
  timestamps: true,
});


// Define associations
Service.hasMany(Booking, { foreignKey: 'serviceId' });
Booking.belongsTo(Service, { foreignKey: 'serviceId' });

// Associations
Booking.belongsTo(GroupSession, { foreignKey: 'groupSessionId', as: 'GroupSession' });
GroupSession.hasMany(Booking, { foreignKey: 'groupSessionId' });

Trainer.hasMany(Booking, { foreignKey: 'trainerId' });
Booking.belongsTo(Trainer, { foreignKey: 'trainerId' });


module.exports = Booking;
