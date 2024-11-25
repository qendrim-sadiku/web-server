const swaggerJsDoc = require('swagger-jsdoc');

// Get the port dynamically from environment variables or fallback to default
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Booking API Documentation',
      version: '1.0.0',
      description: 'API documentation for the booking project',
      contact: {
        name: 'Your Name',
        email: 'your.email@example.com',
      },
    },
    servers: [
      {
        url: `http://${HOST}:${PORT}/api`, // Dynamically set the server URL
      },
    ],
  },
  apis: [
    './docs/**/*.js', // Include all files in the docs folder
  ],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
module.exports = swaggerDocs;
