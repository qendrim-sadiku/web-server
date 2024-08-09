const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize'); // Adjust the path as necessary
const Category = require('./Category'); // Adjust the path as necessary

const SubCategory = sequelize.define('SubCategory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  categoryId: {
    type: DataTypes.INTEGER,
    defaultValue:'1',
    references: {
      model: Category,
      key: 'id'
    },
    onDelete: 'CASCADE',
    allowNull: false
  }
});

Category.hasMany(SubCategory, { foreignKey: 'categoryId' });
SubCategory.belongsTo(Category, { foreignKey: 'categoryId' });

module.exports = SubCategory;
