const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const Address = sequelize.define('Address', {
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
    allowNull: true,
  },
  defaultAddress: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  countryCode: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '+1',
    validate: {
      notEmpty: { msg: 'Country code is required' },
      is: {
        args: /^\+\d+$/,
        msg: 'Country code must be in the format + followed by digits'
      }
    }
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
    validate: {
      notEmpty: { msg: 'Phone number is required' },
      isNumeric: { msg: 'Phone number must contain only numbers' }
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
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
  tableName: 'Addresses'
});

module.exports = Address;
