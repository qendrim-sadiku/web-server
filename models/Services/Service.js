const { DataTypes } = require('sequelize');
const sequelize = require('../../config/sequelize');
const Trainer = require('../Trainer/Trainer');
const SubCategory = require('../Category/SubCategory');
const ServiceDetails = require('./ServiceDetails'); // Import ServiceDetails model

const Service = sequelize.define('Service', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER, // duration in minutes
    allowNull: false
  },
  level: {
    type: DataTypes.ENUM('Beginner', 'Advanced', 'Pro'),
    allowNull: false
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  subCategoryId: {
    type: DataTypes.INTEGER,
    references: {
      model: SubCategory,
      key: 'id'
    },
    allowNull: false
  },
  hourlyRate: {
    type: DataTypes.FLOAT,
    allowNull: false
  }
}, {
  timestamps: true // This ensures Sequelize automatically handles createdAt and updatedAt
});

const ServiceTrainer = sequelize.define('ServiceTrainer', {
  serviceId: {
    type: DataTypes.INTEGER,
    references: {
      model: Service,
      key: 'id'
    },
    allowNull: false
  },
  trainerId: {
    type: DataTypes.INTEGER,
    references: {
      model: Trainer,
      key: 'id'
    },
    allowNull: false
  }
}, {
  timestamps: true // This ensures Sequelize automatically handles createdAt and updatedAt
});


// Define associations
Service.hasOne(ServiceDetails, { foreignKey: 'serviceId', onDelete: 'CASCADE' });
ServiceDetails.belongsTo(Service, { foreignKey: 'serviceId' });

Service.belongsToMany(Trainer, { through: ServiceTrainer, foreignKey: 'serviceId' });
Trainer.belongsToMany(Service, { through: ServiceTrainer, foreignKey: 'trainerId' });

SubCategory.hasMany(Service, { foreignKey: 'subCategoryId' });
Service.belongsTo(SubCategory, { foreignKey: 'subCategoryId' });

module.exports = { Service, ServiceTrainer };
