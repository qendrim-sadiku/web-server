// config/webauthnConfig.js
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  rpName: 'YourAppName', // Name of your application
  rpID: process.env.WEB_AUTHN_RPID || 'localhost', // Relying Party ID
  origin: process.env.WEB_AUTHN_ORIGIN || 'https://localhost:3000', // Full URL with HTTPS
};
