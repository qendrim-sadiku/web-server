// const sequelize = require('./config/sequelize');
// require('./models/User');
// require('./models/Services/Booking');
// require('./models/Services/Service');
// require('./models/Services/Participant');
// require('./models/Trainer/Trainer');
// require('./models/Services/ServiceTrainer');
// require('./models/Category/Category');
// require('./models/Category/SubCategory');

// // Import the associations
// require('./models/associations');

// sequelize.sync({ force: true, logging: console.log })  // Set force: true to drop and recreate tables
//   .then(() => {
//     console.log('Database & tables created!');
//   })
//   .catch((error) => {
//     console.error('Error creating database & tables:', error);
//   });
const sequelize = require('./config/sequelize');

// Import models
require('./models/User');
require('./models/Services/Booking');
require('./models/Services/Service');
require('./models/Services/Participant');
require('./models/Trainer/Trainer');
require('./models/Services/ServiceTrainer');
require('./models/Category/Category');
require('./models/Category/SubCategory');

// models/associations.js
const { Model } = require('sequelize');
const User = require('./User');
const Booking = require('./Services/Booking');
const Service = require('./Services/Service');
const Participant = require('./Services/Participant');
const Trainer = require('./Trainer/Trainer');
const BookingParticipant = require('./Services/BookingParticipants');
const ServiceTrainer = require('./Services/ServiceTrainer');

// Function to validate if an object is a Sequelize Model
const isSequelizeModel = (obj) => obj instanceof Model;

// Define associations
const defineAssociations = () => {
  if (!isSequelizeModel(User) || !isSequelizeModel(Booking) || !isSequelizeModel(Service) ||
      !isSequelizeModel(Participant) || !isSequelizeModel(Trainer) || !isSequelizeModel(BookingParticipant) ||
      !isSequelizeModel(ServiceTrainer)) {
    throw new Error('One or more models are not valid Sequelize models.');
  }

  User.hasMany(Booking, { foreignKey: 'userId' });
  Booking.belongsTo(User, { foreignKey: 'userId' });

  Service.hasMany(Booking, { foreignKey: 'serviceId' });
  Booking.belongsTo(Service, { foreignKey: 'serviceId' });

  Trainer.hasMany(Booking, { foreignKey: 'trainerId' });
  Booking.belongsTo(Trainer, { foreignKey: 'trainerId' });

  Booking.belongsToMany(Participant, { through: BookingParticipant, foreignKey: 'bookingId' });
  Participant.belongsToMany(Booking, { through: BookingParticipant, foreignKey: 'participantId' });

  Service.belongsToMany(Trainer, { through: ServiceTrainer, foreignKey: 'serviceId' });
  Trainer.belongsToMany(Service, { through: ServiceTrainer, foreignKey: 'trainerId' });
};

module.exports = defineAssociations;

// Disable foreign key checks
sequelize.query('SET FOREIGN_KEY_CHECKS = 0')
  .then(() => {
    // Sync the models
    return sequelize.sync({ force: true, logging: console.log });
  })
  .then(() => {
    console.log('Database & tables created!');
    // Enable foreign key checks
    return sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  })
  .catch((error) => {
    console.error('Error creating database & tables:', error);
  });
