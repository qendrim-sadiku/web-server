// MeetingPoint model
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const MeetingPoint = sequelize.define('MeetingPoint', {
  country: {
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  street: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  zipCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  defaultAddress: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,  // Marking one meeting point as default
  },
  UserId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users',
      key: 'id'
    },
    allowNull: false
  }
}, {
  timestamps: true,
  tableName: 'MeetingPoints'
});

module.exports = MeetingPoint;