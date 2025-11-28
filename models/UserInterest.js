const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User');
const { Service } = require('./Services/Service'); // Assuming you already have a Service model

const UserInterest = sequelize.define('UserInterest', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id',
    },
  },
  serviceId: {
    type: DataTypes.INTEGER,
    references: {
      model: Service,
      key: 'id',
    },
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true, // Optional field
  },
}, {
  timestamps: true,
});

User.belongsToMany(Service, { through: UserInterest, as: 'interests', foreignKey: 'userId' });
Service.belongsToMany(User, { through: UserInterest, as: 'interestedUsers', foreignKey: 'serviceId' });

module.exports = UserInterest;
