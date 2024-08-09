const { faker } = require('@faker-js/faker');
const sequelize = require('../config/sequelize'); // Adjust the path as necessary
const Trainer = require('../models/Trainer/Trainer'); // Adjust the path as necessary

const createSampleTrainers = async () => {
  await sequelize.sync({ force: true }); // Drops and re-creates the tables

  const specializations = {
    sport: ['tennis', 'soccer', 'basketball'],
    art: ['painting', 'sculpture', 'photography'],
    science: ['physics', 'chemistry', 'biology'],
    technology: ['programming', 'networking', 'AI'],
    health: ['nutrition', 'physical therapy', 'mental health'],
    education: ['math', 'history', 'literature']
  };

  const levels = ['beginner', 'pro', 'advanced'];

  const trainers = Array.from({ length: 10 }).map(() => {
    const specialization = faker.helpers.arrayElement(Object.keys(specializations));
    const subSpecialization = faker.helpers.arrayElement(specializations[specialization]);
    const hourlyRate = faker.datatype.float({ min: 20, max: 100, precision: 0.01 });

    return {
      name: faker.name.firstName(),
      surname: faker.name.lastName(),
      username: faker.internet.userName(),
      avatar: faker.image.avatar(),
      description: faker.lorem.sentences(2),
      level: faker.helpers.arrayElement(levels),
      specialization,
      subSpecialization,
      email: faker.internet.email(),
      hourlyRate
    };
  });

  await Trainer.bulkCreate(trainers);
  console.log('Sample trainers created successfully!');
};

createSampleTrainers().catch((error) => {
  console.error('Error creating sample trainers:', error);
});