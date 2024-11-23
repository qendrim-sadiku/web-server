// config/swagger.js
const swaggerJsDoc = require('swagger-jsdoc');

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
        url: 'http://localhost:3000/api', // Base URL with /api prefix
      },
    ],
    components: {
    
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './routes/**/*.js', // This includes all route files in the routes directory and subdirectories
  ],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

module.exports = swaggerDocs;
