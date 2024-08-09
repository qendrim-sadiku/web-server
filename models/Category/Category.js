const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize'); // Adjust the path as necessary

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
});

module.exports = Category;
