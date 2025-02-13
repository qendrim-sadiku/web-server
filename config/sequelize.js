const { Sequelize } = require('sequelize');
require('dotenv').config();

// Initialize Sequelize with your environment variables
const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  port: process.env.DB_PORT || 3306, // Default MySQL port
  // logging: console.log, // Enable logging for debugging (set to false in production)
  dialectOptions: {
    ssl: false // Disable SSL if not supported by your MySQL server
},
  pool: {
    max: 5, // Maximum number of connections in the pool
    min: 0, // Minimum number of connections in the pool
    acquire: 30000, // Maximum time (ms) to try to get a connection before throwing error
    idle: 10000, // Time (ms) after which an idle connection is released
  },
});

// Test the database connection
sequelize
  .authenticate()
  .then(() => {
    console.log('Connection to the database has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err.message);
  });

module.exports = sequelize;
