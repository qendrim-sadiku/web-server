// const { DataTypes } = require('sequelize');
// const sequelize = require('../../config/sequelize');
// const Category = require('../Category/Category');

// const Trainer = sequelize.define('Trainer', {
//     id: {
//       type: DataTypes.INTEGER,
//       autoIncrement: true,
//       primaryKey: true
//     },
//     name: {
//       type: DataTypes.STRING,
//       allowNull: false
//     },
//     surname: {
//       type: DataTypes.STRING,
//       allowNull: false
//     },
//     description: {
//       type: DataTypes.TEXT,
//       allowNull: false
//     },
//     avatar: {
//       type: DataTypes.STRING,
//       allowNull: true
//     },
//     userRating: {
//       type: DataTypes.FLOAT,
//       allowNull: true,
//       defaultValue: 0.0
//     },
//     specialization: {
//       type: DataTypes.STRING,
//       allowNull: false
//     },
//     level: {
//       type: DataTypes.ENUM('Beginner', 'Advanced', 'Pro'),
//       allowNull: false
//     },
//     hourlyRate: {
//       type: DataTypes.FLOAT,
//       allowNull: false
//     },
//     categoryId: {
//       type: DataTypes.INTEGER,
//       references: {
//         model: Category,
//         key: 'id'
//       },
//       allowNull: false
//     }
//   });
  
//   Category.hasMany(Trainer, { foreignKey: 'categoryId' });
//   Trainer.belongsTo(Category, { foreignKey: 'categoryId' });

// module.exports = Trainer;

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
  }
}, {
  timestamps: true // This ensures Sequelize automatically handles createdAt and updatedAt
});

Category.hasMany(Trainer, { foreignKey: 'categoryId' });
Trainer.belongsTo(Category, { foreignKey: 'categoryId' });

module.exports = Trainer;
