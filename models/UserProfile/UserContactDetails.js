const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const UserContactDetails = sequelize.define('UserContactDetails', {
  UserId: {
    type: DataTypes.INTEGER,
    defaultValue: '1',
    references: {
      model: 'Users',
      key: 'id'
    },
    allowNull: false
  },
  countryCode: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '+1',  // Set a default value if appropriate
    validate: {
      notEmpty: {
        msg: 'Country code is required'
      },
      is: {
        args: /^\+\d+$/,
        msg: 'Country code must be in the format + followed by digits'
      }
    }
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',  // Set a default value if appropriate
    validate: {
      notEmpty: {
        msg: 'Phone number is required'
      },
      isNumeric: {
        msg: 'Phone number must contain only numbers'
      }
    }
  }
}, {
  timestamps: true,
  tableName: 'UserContactDetails'
});

module.exports = UserContactDetails;
