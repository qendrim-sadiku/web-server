const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const Booking = require('./Booking');

const Participant = sequelize.define('Participant', {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  surname: {
    type: DataTypes.STRING,
    allowNull: false
  },
  age: {
    type: DataTypes.INTEGER,
    validate: {
      isValidAge(value) {
        if (this.category === 'Teenager' || this.category === 'Child') {
          if (!value) {
            throw new Error('Age is required for Teenagers and Children.');
          }
          if (value <= 0) {
            throw new Error('Age must be a positive number.');
          }
        }
      }
    }
  },
  category: {
    type: DataTypes.ENUM('Adult', 'Teenager', 'Child'),
    allowNull: false
  }
}, {
  timestamps: true
});

Booking.hasMany(Participant, { foreignKey: 'bookingId' });
Participant.belongsTo(Booking, { foreignKey: 'bookingId' });

module.exports = Participant;
