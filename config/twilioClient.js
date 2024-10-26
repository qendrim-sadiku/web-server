// twilioClient.js

const twilio = require('twilio');
require('dotenv').config(); // Load environment variables

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN,process.env.TWILIO_PHONE_NUMBER);

module.exports = client;
