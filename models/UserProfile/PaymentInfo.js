const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const PaymentInfo = sequelize.define('PaymentInfo', {
  cardNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Card number is required' },
      len: { args: [16, 16], msg: 'Card number must be 16 digits' }
    }
  },
  cardHolderName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Card holder name is required' }
    }
  },
  cvv: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'CVV is required' },
      len: { args: [3, 4], msg: 'CVV must be 3 or 4 digits' }
    }
  },
  expirationDate: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Expiration date is required' },
      isDate: { msg: 'Invalid date format' }
    }
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true, // Optional
    validate: {
      notEmpty: { msg: 'Country cannot be empty' }
    }
  },
  zipCode: {
    type: DataTypes.STRING,
    allowNull: true, // Optional
    validate: {
      len: { args: [5, 10], msg: 'Zip code must be between 5 and 10 characters' }
    }
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false // By default, no card is marked as default
  }
});

module.exports = PaymentInfo;
