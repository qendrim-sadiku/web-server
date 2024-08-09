// config/sequelize.js
const { Sequelize } = require('sequelize');
require('dotenv').config();



const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
    logging: false // Set to true if you want to see SQL queries

});

module.exports = sequelize;
