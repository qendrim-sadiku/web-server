const { Sequelize } = require('sequelize');
require('dotenv').config();




// Initialize Sequelize with your environment variables
const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  port: process.env.DB_PORT || 3306, // Default MySQL port
  logging: console.log, // Log SQL queries
});

// Test the database connection
sequelize.authenticate()
  .then(() => {
    console.log('Connection to the database has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err.message);
  });

  

module.exports = sequelize;
