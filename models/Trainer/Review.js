// models/Review.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const Trainer = require('./Trainer');
const User = require('../User');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  rating: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  trainerId: {
    type: DataTypes.INTEGER,
    references: {
      model: Trainer,
      key: 'id'
    },
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    },
    allowNull: false
  }
}, {
  timestamps: true
});

Trainer.hasMany(Review, { foreignKey: 'trainerId' });
Review.belongsTo(Trainer, { foreignKey: 'trainerId' });

User.hasMany(Review, { foreignKey: 'userId' });
Review.belongsTo(User, { foreignKey: 'userId' });

module.exports = Review;
