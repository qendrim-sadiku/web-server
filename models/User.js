const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const bcrypt = require('bcrypt'); // Assuming bcrypt for password hashing

const UserContactDetails = require('./UserProfile/UserContactDetails');
const Address = require('./UserProfile/Address');
const MeetingPoint = require('./UserProfile/MeetingPoint');
const UserDetails = require('./UserProfile/UserDetails');
const PaymentInfo = require('./UserProfile/PaymentInfo');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Name is required'
      }
    }
  },
  surname: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Surname is required'
      }
    }
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true,
  },
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
  sportPreference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  expertisePreference: {
    type: DataTypes.STRING,
    allowNull: true
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
    validate: {
      notEmpty: { msg: 'Password is required' },
      len: { args: [6, 255], msg: 'Password must be between 6 and 255 characters' }
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'admin', 'trainer'),
    defaultValue: 'user'
  },
  isProfileCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false, // By default, profile is not completed
  }
});

User.hasOne(Address, { onDelete: 'CASCADE' });
Address.belongsTo(User);

User.hasMany(MeetingPoint, { onDelete: 'CASCADE' });
MeetingPoint.belongsTo(User);

User.hasOne(UserDetails, { onDelete: 'CASCADE' });
UserDetails.belongsTo(User);

User.hasOne(UserContactDetails, { onDelete: 'CASCADE' });
UserContactDetails.belongsTo(User);

User.hasOne(PaymentInfo, { onDelete: 'CASCADE' });
PaymentInfo.belongsTo(User);

module.exports = User;
