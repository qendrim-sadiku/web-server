const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./config/swagger'); // Import the Swagger docs
// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const serviceRoutes = require('./routes/services/servicesRoutes');
const bookingRoutes = require('./routes/bookings/bookingRoutes');
const trainerRoutes = require('./routes/trainer/trainerRoutes');
const locationRoutes = require('./routes/locationRoutes');
const notificationRoutes = require('./routes/notifications'); // Import the notification routes
const userInterestRoutes = require('./routes/userInterestRouter');

// Import Sequelize instance
const sequelize = require('./config/sequelize');

// Import and initialize the cron job
require('./cronJobs/bookingReminder'); // Import the cron job

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Test the Sequelize connection
sequelize.authenticate()
  .then(() => {
    console.log('Connection to the database has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.use('/auth', authRoutes);  // Authentication routes
app.use('/api', userRoutes);  // User routes
app.use('/countries', locationRoutes);  // Location routes
app.use('/api/services', serviceRoutes);  // Service routes
app.use('/api', bookingRoutes);  // Booking routes
app.use('/api/trainers', trainerRoutes);  // Trainer routes
app.use('/api', categoryRoutes);  // Category routes
app.use('/api/notifications', notificationRoutes); // Register the notification routes
app.use('/api/', userInterestRoutes);



// Serve static files from the uploads directory
app.use('/uploads', express.static(uploadDir));

// Root route to send a message when visiting the app
app.get('/', (req, res) => {
  res.send('Welcome to the Express App!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);

});

module.exports = app; // Export the app for WebSocket connection if needed
