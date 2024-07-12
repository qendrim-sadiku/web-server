const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const Address = sequelize.define('Address', {
  country: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Country is required'
      }
    }
  },
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

module.exports = Address;
