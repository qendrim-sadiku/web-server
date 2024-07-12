// models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const bcrypt = require('bcrypt');

const ContactDetails = require('./UserProfile/ContactDetails');
const Address = require('./UserProfile/Address');
const MeetingPoint = require('./UserProfile/MeetingPoint');

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      msg: 'Username already exists'
    },
    validate: {
      notEmpty: {
        msg: 'Username is required'
      },
      len: {
        args: [3, 20],
        msg: 'Username must be between 3 and 20 characters'
      }
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      msg: 'Email already exists'
    },
    validate: {
      notEmpty: {
        msg: 'Email is required'
      },
      isEmail: {
        msg: 'Invalid email format'
      }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      const hashedPassword = bcrypt.hashSync(value, 10); // Hash password before saving
      this.setDataValue('password', hashedPassword);
    },
    validate: {
      notEmpty: {
        msg: 'Password is required'
      },
      len: {
        args: [6, 255], // Allow passwords between 6 and 255 characters
        msg: 'Password must be between 6 and 255 characters'
      }
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  }
});

User.hasOne(ContactDetails, { onDelete: 'CASCADE' });
ContactDetails.belongsTo(User);

User.hasOne(Address, { onDelete: 'CASCADE' });
Address.belongsTo(User);

User.hasMany(MeetingPoint, { onDelete: 'CASCADE' });
MeetingPoint.belongsTo(User);

module.exports = User;
