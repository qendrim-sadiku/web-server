
require('dotenv').config(); // Load environment variables at the very beginning

module.exports = {
  jwtSecret: process.env.JWT_SECRET, // Ensure JWT_SECRET is defined in your environment
  // Add other configuration variables as needed
};