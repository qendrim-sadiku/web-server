const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const ContactDetails = sequelize.define('ContactDetails', {
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Phone number is required'
      },
      isNumeric: {
        msg: 'Phone number must contain only numbers'
      }
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Email is required'
      },
      isEmail: {
        msg: 'Invalid email format'
      }
    }
  }
});

module.exports = ContactDetails;
