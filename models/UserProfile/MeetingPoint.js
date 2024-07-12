const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const MeetingPoint = sequelize.define('MeetingPoint', {
  city: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'City is required'
      }
    }
  },
  street: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Street is required'
      }
    }
  }
});

module.exports = MeetingPoint;
