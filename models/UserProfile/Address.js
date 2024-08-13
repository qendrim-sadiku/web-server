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
    type: DataTypes.STRING, // Ensure this matches your schema
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