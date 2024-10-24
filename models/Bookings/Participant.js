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
    allowNull: true,
    validate: {
      isValidAge(value) {
        if (this.category === 'Teenager' || this.category === 'Child') {
          // Ensure age is provided and is a positive number for Teenager and Child categories
          if (!value) {
            throw new Error('Age is required for Teenagers and Children.');
          }
          if (value <= 0) {
            throw new Error('Age must be a positive number.');
          }
        } else if (this.category === 'Adult') {
          // Ensure age is not set for adults (optional, remove this check if you allow age for adults)
          if (value !== null && value !== undefined) {
            throw new Error('Age should not be provided for Adults.');
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
