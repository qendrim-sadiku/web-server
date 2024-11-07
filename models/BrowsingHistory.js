const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User'); // Adjust path if necessary
const {Service} = require('./Services/Service');

const BrowsingHistory = sequelize.define('BrowsingHistory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  serviceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Service,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  viewedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true
});

// Define associations
User.hasMany(BrowsingHistory, { foreignKey: 'userId', onDelete: 'CASCADE' });
BrowsingHistory.belongsTo(User, { foreignKey: 'userId' });

Service.hasMany(BrowsingHistory, { foreignKey: 'serviceId', onDelete: 'CASCADE' });
BrowsingHistory.belongsTo(Service, { foreignKey: 'serviceId' });

module.exports = BrowsingHistory;
