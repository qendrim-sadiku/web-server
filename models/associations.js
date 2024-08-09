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
