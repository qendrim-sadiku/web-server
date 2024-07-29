const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');

const UserDetails = sequelize.define('UserDetails', {
  birthDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  gender: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  UserId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Users',
      key: 'id',
    },
    allowNull: false,
  },
}, {
  timestamps: true,
});

module.exports = UserDetails;
