const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const Category = require('../Category/Category');
const SubCategory = require('../Category/SubCategory');

const Trainer = sequelize.define('Trainer', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  surname: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userRating: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0.0
  },
  specialization: {
    type: DataTypes.STRING,
    allowNull: false
  },
  level: {
    type: DataTypes.ENUM('Beginner', 'Advanced', 'Pro'),
    allowNull: false
  },
  hourlyRate: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  categoryId: {
    type: DataTypes.INTEGER,
    references: {
      model: Category,
      key: 'id'
    },
    allowNull: false
  },
  subcategoryId: {
    type: DataTypes.INTEGER,
    references: {
      model: SubCategory,
      key: 'id'
    },
    allowNull: false
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: false
  },
  skills: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const skills = this.getDataValue('skills');
      return skills ? JSON.parse(skills) : [];
    },
    set(value) {
      this.setDataValue('skills', JSON.stringify(value));
    }
  },
  yearsOfExperience: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  certification: {
    type: DataTypes.STRING,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('Individual', 'Business'),
    allowNull: false
  },
  backgroundCheck: {
    type: DataTypes.STRING,
    allowNull: true // Validation will be handled manually
  },
  ageGroup: {
    type: DataTypes.ENUM('Adults', 'Teenagers', 'Children'), // New age group field
    allowNull: false
  }
}, {
  timestamps: true
});


Category.hasMany(Trainer, { foreignKey: 'categoryId' });
Trainer.belongsTo(Category, { foreignKey: 'categoryId' });


module.exports = Trainer;
