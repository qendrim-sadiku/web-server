const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const sequelize = require('./config/sequelize'); // Adjust the path if necessary
const User = require('./models/User'); // Adjust the path if necessary
const ContactDetails = require('./models/UserProfile/ContactDetails'); // Adjust the path if necessary
const Address = require('./models/UserProfile/Address'); // Adjust the path if necessary
const MeetingPoint = require('./models/UserProfile/MeetingPoint'); // Adjust the path if necessary
const UserDetails = require('./models/UserProfile/UserDetails'); // Adjust the path if necessary

const generateNumericPhoneNumber = () => faker.phone.number('##########'); // Numeric-only

const fixedPassword = 'T3st123!'; // Fixed password
const hashedPassword = bcrypt.hashSync(fixedPassword, 10); // Hash the fixed password

const generateFakeUsers = async (num) => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    for (let i = 0; i < num; i++) {
      const user = await User.create({
        username: faker.internet.userName(),
        email: faker.internet.email(),
        password: hashedPassword, // Use the fixed hashed password
        role: faker.helpers.arrayElement(['user', 'admin', 'trainer']),
      });

      // Log the username and fixed password for reference
      console.log(`Generated user: ${user.username}`);
      console.log(`Password: ${fixedPassword}`);

      await ContactDetails.create({
        phoneNumber: generateNumericPhoneNumber(),
        email: faker.internet.email(),
        UserId: user.id,
      });

      await Address.create({
        country: faker.address.country(),
        city: faker.address.city(),
        street: faker.address.streetAddress(),
        zipCode: faker.address.zipCode(),
        UserId: user.id,
      });

      await UserDetails.create({
        birthDate: faker.date.past(30, new Date(2000, 0, 1)).toISOString().split('T')[0], // Birthdate in YYYY-MM-DD format
        gender: faker.helpers.arrayElement(['male', 'female', 'other']),
        UserId: user.id,
      });

      for (let j = 0; j < faker.datatype.number({ min: 1, max: 3 }); j++) {
        await MeetingPoint.create({
          address: faker.address.streetAddress(),
          city: faker.address.city(),
          street: faker.address.streetName(),
          zipCode: faker.address.zipCode(),
          UserId: user.id,
        });
      }
    }

    console.log('Fake users generated successfully!');
  } catch (error) {
    console.error('Error generating fake users:', error);
  } finally {
    await sequelize.close();
  }
};

generateFakeUsers(10); // Adjust the number as needed
