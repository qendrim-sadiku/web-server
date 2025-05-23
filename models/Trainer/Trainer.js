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
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
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
    allowNull: true
  },
  ageGroup: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const val = this.getDataValue('ageGroup');
      return val ? JSON.parse(val) : [];
    },
    set(val) {
      this.setDataValue('ageGroup', JSON.stringify(val));
    }
  },
  

  // ✅ New fields added:
  ssn: {
    type: DataTypes.STRING,
    allowNull: true
  },
  typeOfServiceProvider: {
    type: DataTypes.STRING,
    allowNull: true
  },
  certificationStatus: {
    type: DataTypes.STRING,
    allowNull: true
  },
  providerCategory: {
    type: DataTypes.STRING,
    allowNull: true
  },
  availability: {
    type: DataTypes.STRING,
    allowNull: true
  },
  style: {
    type: DataTypes.STRING,
    allowNull: true
  },
  distance: {
    type: DataTypes.STRING,
    allowNull: true
  },
  serviceAvailability: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const val = this.getDataValue('serviceAvailability');
      return val ? JSON.parse(val) : [];
    },
    set(val) {
      this.setDataValue('serviceAvailability', JSON.stringify(val));
    }
  },
  highlights: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  location: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const val = this.getDataValue('location');
      return val ? JSON.parse(val) : [];
    },
    set(val) {
      this.setDataValue('location', JSON.stringify(val));
    }
  },
  settings: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const val = this.getDataValue('settings');
      return val ? JSON.parse(val) : [];
    },
    set(val) {
      this.setDataValue('settings', JSON.stringify(val));
    }
  },
  serviceFormat: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const val = this.getDataValue('serviceFormat');
      return val ? JSON.parse(val) : [];
    },
    set(val) {
      this.setDataValue('serviceFormat', JSON.stringify(val));
    }
  },
  groupRangeFrom: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  groupRangeTo: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  duration: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customDurationHours: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  features: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const val = this.getDataValue('features');
      return val ? JSON.parse(val) : [];
    },
    set(val) {
      this.setDataValue('features', JSON.stringify(val));
    }
  },
  expertise: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const val = this.getDataValue('expertise');
      return val ? JSON.parse(val) : [];
    },
    set(val) {
      this.setDataValue('expertise', JSON.stringify(val));
    }
  },
  degree: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fieldOfStudy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tennisCertification: {
    type: DataTypes.STRING,
    allowNull: true
  },
  basePrice: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  weekendPrice: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  additionalPersonPrice: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  discounts: {
    type: DataTypes.JSON,
    allowNull: true
  },
  advancedOrderDiscount: {
    type: DataTypes.JSON,
    allowNull: true
  },
  additionalFees: {
    type: DataTypes.JSON,
    allowNull: true
  },  
  equipment: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const v = this.getDataValue('equipment');
      return v ? JSON.parse(v) : [];
    },
    set(v) {
      this.setDataValue('equipment', JSON.stringify(v || []));
    }
  },
  trainingAids: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const v = this.getDataValue('trainingAids');
      return v ? JSON.parse(v) : [];
    },
    set(v) {
      this.setDataValue('trainingAids', JSON.stringify(v || []));
    }
  },
  protectiveGear: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const v = this.getDataValue('protectiveGear');
      return v ? JSON.parse(v) : [];
    },
    set(v) {
      this.setDataValue('protectiveGear', JSON.stringify(v || []));
    }
  },
  accessories: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const v = this.getDataValue('accessories');
      return v ? JSON.parse(v) : [];
    },
    set(v) {
      this.setDataValue('accessories', JSON.stringify(v || []));
    }
  },
  languages: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const val = this.getDataValue('languages');
      return val ? JSON.parse(val) : [];
    },
    set(val) {
      this.setDataValue('languages', JSON.stringify(val));
    }
  }

}, {
  timestamps: true
});

Category.hasMany(Trainer, { foreignKey: 'categoryId' });
Trainer.belongsTo(Category, { foreignKey: 'categoryId' });

SubCategory.hasMany(Trainer, { foreignKey: 'subcategoryId' });
Trainer.belongsTo(SubCategory, { foreignKey: 'subcategoryId' });

module.exports = Trainer;
