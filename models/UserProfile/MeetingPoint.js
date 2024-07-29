const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const MeetingPoint = sequelize.define('MeetingPoint', {
  address: {
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
  zipCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
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
  tableName: 'MeetingPoints'
});
module.exports = MeetingPoint;
