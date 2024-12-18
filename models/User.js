const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

// Import related models
const UserContactDetails = require('./UserProfile/UserContactDetails');
const Address = require('./UserProfile/Address');
const MeetingPoint = require('./UserProfile/MeetingPoint');
const UserDetails = require('./UserProfile/UserDetails');
const PaymentInfo = require('./UserProfile/PaymentInfo');
const UserPreferences = require('./UserProfile/UserPreferences');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true, // Allow null for optional fields
    validate: {
      notEmpty: {
        msg: 'Name is required',
      },
    },
  },
  surname: {
    type: DataTypes.STRING,
    allowNull: true, // Allow null for optional fields
    validate: {
      notEmpty: {
        msg: 'Surname is required',
      },
    },
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true, // Optional field
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true, // Allow null for optional fields
    unique: {
      msg: 'Username already exists',
    },
    validate: {
      notEmpty: {
        msg: 'Username is required',
      },
      len: {
        args: [3, 20],
        msg: 'Username must be between 3 and 20 characters',
      },
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true, // Optional field
    validate: {
      len: {
        args: [0, 500], // Restrict length to a maximum of 500 characters
        msg: 'Description must not exceed 500 characters',
      },
    },
  },
  
  verificationCode: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  verificationCodeExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  
  sportPreference: {
    type: DataTypes.STRING,
    allowNull: true, // Optional field
  },
  expertisePreference: {
    type: DataTypes.STRING,
    allowNull: true, // Optional field
  },
  fcmToken: {
    type: DataTypes.STRING,
    allowNull: true, // Optional field
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true, // Required field
    unique: {
      msg: 'Email already exists',
    },
    validate: {
      notEmpty: {
        msg: 'Email is required',
      },
      isEmail: {
        msg: 'Invalid email format',
      },
    },
  },
  passwordLastUpdatedAt: {
    type: DataTypes.DATE,
    allowNull: true, // Optional field, initially null
    defaultValue: null,
    comment: 'Timestamp for last password update',
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true, // Allow null for OAuth users
  },
  
  provider: {
    type: DataTypes.STRING, // e.g., 'google', 'facebook'
    allowNull: true, // Optional field
  },
  providerId: {
    type: DataTypes.STRING, // OAuth provider user ID
    allowNull: true, // Optional field
  },
  role: {
    type: DataTypes.ENUM('user', 'admin', 'trainer'),
    defaultValue: 'user', // Default to 'user'
  },
  isProfileCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false, // By default, profile is not completed
  },
});

// Define relationships
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

User.hasOne(UserPreferences, { onDelete: 'CASCADE' });
UserPreferences.belongsTo(User);

module.exports = User;
