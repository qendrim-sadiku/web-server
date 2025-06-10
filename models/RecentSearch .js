const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User');

const RecentSearch = sequelize.define(
  'RecentSearch',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    query: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: true, // ✅ Moved to the options section
  }
);

User.hasMany(RecentSearch, { onDelete: 'CASCADE' });
RecentSearch.belongsTo(User);

module.exports = RecentSearch;
