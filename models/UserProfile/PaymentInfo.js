// models/UserProfile/PaymentInfo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const PaymentInfo = sequelize.define('PaymentInfo', {
  cardNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '4111111111111111',
    validate: {
      notEmpty: { msg: 'Card number is required' },
      len: { args: [16, 16], msg: 'Card number must be 16 digits' }
    }
  },
  cardHolderName: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'John Doe',
    validate: {
      notEmpty: { msg: 'Card holder name is required' }
    }
  },
  cvv: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '123',
    validate: {
      notEmpty: { msg: 'CVV is required' },
      len: { args: [3, 4], msg: 'CVV must be 3 or 4 digits' }
    }
  },
  expirationDate: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '12/24',
    validate: {
      notEmpty: { msg: 'Expiration date is required' },
      isDate: { msg: 'Invalid date format' }
    }
  }
});

module.exports = PaymentInfo;
