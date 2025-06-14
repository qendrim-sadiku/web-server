// const express = require('express');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// const path = require('path');
// const fs = require('fs');
// const swaggerUi = require('swagger-ui-express');
// const swaggerDocs = require('./config/swagger'); // Import the Swagger docs
// const session = require('express-session');
// require('dotenv').config();
// const passport = require('./config/passport'); // Import Passport config
// const sequelize = require('./config/sequelize'); // Sequelize instance
// require('./cronJobs/bookingReminder'); // Import the cron job

// // Import Routes
// const authRoutes = require('./routes/authRoutes');
// const userRoutes = require('./routes/userRoutes');
// const categoryRoutes = require('./routes/categoryRoutes');
// const serviceRoutes = require('./routes/services/servicesRoutes');
// const bookingRoutes = require('./routes/bookings/bookingRoutes');
// const trainerRoutes = require('./routes/trainer/trainerRoutes');
// const locationRoutes = require('./routes/locationRoutes');
// const notificationRoutes = require('./routes/notifications'); // Notification routes
// const userInterestRoutes = require('./routes/userInterestRouter');

// // Initialize Express app
// const app = express();
// const PORT = process.env.PORT || 3000;

// // Ensure the uploads directory exists
// const uploadDir = path.join(__dirname, 'uploads');
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir);
// }

// // Middleware setup
// app.use(bodyParser.json()); // Parse JSON request bodies
// app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded data
// app.use(cors()); // Enable CORS for all origins

// // Session middleware
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET || 'your-secret-key',
//     resave: false,
//     saveUninitialized: true,
//     cookie: {
//       secure: false, // Use true if HTTPS
//       maxAge: 3600000, // 1 hour in milliseconds
//     },
//   })
// );

// // Passport middleware
// app.use(passport.initialize());
// app.use(passport.session());

// // Test the Sequelize connection
// sequelize.authenticate()
//   .then(() => console.log('Connection to the database has been established successfully.'))
//   .catch(err => console.error('Unable to connect to the database:', err));

// // Swagger documentation
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// // Routes
// app.use('/', authRoutes); // Authentication routes
// app.use('/api', userRoutes); // User routes
// app.use('/countries', locationRoutes); // Location routes
// app.use('/api/services', serviceRoutes); // Service routes
// app.use('/api', bookingRoutes); // Booking routes
// app.use('/api/trainers', trainerRoutes); // Trainer routes
// app.use('/api', categoryRoutes); // Category routes
// app.use('/api/notifications', notificationRoutes); // Notification routes
// app.use('/api/', userInterestRoutes); // User interest routes

// // Serve static files
// app.use('/uploads', express.static(uploadDir));

// // Root route
// app.get('/', (req, res) => res.send('Welcome to the Express App!'));

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error('Error:', err);
//   res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
// });

// // Start the server
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
//   console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
// });

// module.exports = app;

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./config/swagger'); // Import the Swagger docs
const session = require('express-session');
const passport = require('./config/passport'); // Import Passport config
const sequelize = require('./config/sequelize'); // Sequelize instance
require('dotenv').config();
// require('./cronJobs/bookingReminder'); // Import the cron job

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const serviceRoutes = require('./routes/services/servicesRoutes');
const bookingRoutes = require('./routes/bookings/bookingRoutes');
const trainerRoutes = require('./routes/trainer/trainerRoutes');
const locationRoutes = require('./routes/locationRoutes');
const notificationRoutes = require('./routes/notifications'); // Notification routes
const userInterestRoutes = require('./routes/userInterestRouter');
const groupSessionsRouter = require('./routes/groupSessions');
const recentSearchRoutes = require('./routes/recentSearchRoutes');
const subUserRoutes = require('./routes/subUserRoutes');
const googlePlacesRoutes = require('./routes/googlePlacesRoutes');


// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = `https://srv687018.hstgr.cloud:${PORT}`;

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware setup
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

const allowedOrigins = [
  'http://localhost:4200',      // Angular dev
  'https://aroit.com',          // Production domain
  'capacitor://localhost',      // iOS
  'http://localhost',           // Android
  'https://localhost',          // HTTPS local dev
  // Add any others if necessary
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl requests)
      if (!origin) {
        return callback(null, true);
      }
      // If origin is in the allowed list, allow it
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Otherwise, block
      return callback(new Error(`CORS not allowed from origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Handle preflight requests
app.options('*', cors());

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false, // Prevent saving session if it wasn’t modified
    saveUninitialized: false, // Don’t save uninitialized sessions
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: 'none', // Allows cookies across origins
      maxAge: 3600000, // 1 hour in milliseconds
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Test the Sequelize connection
sequelize
  .authenticate()
  .then(() => console.log('Connection to the database has been established successfully.'))
  .catch((err) => console.error('Unable to connect to the database:', err));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.use('/', authRoutes); // Authentication routes
app.use('/api', userRoutes); // User routes
app.use('/countries', locationRoutes); // Location routes
app.use('/api/services', serviceRoutes); // Service routes
app.use('/api', bookingRoutes); // Booking routes
app.use('/api/trainers', trainerRoutes); // Trainer routes
app.use('/api', categoryRoutes); // Category routes
app.use('/api/notifications', notificationRoutes); // Notification routes
app.use('/api/', userInterestRoutes); // User interest routes
app.use('/api/', recentSearchRoutes ); // User interest routes
app.use('/api', subUserRoutes);

app.use('/api/group-sessions', groupSessionsRouter);
app.use('/api/google', googlePlacesRoutes);



// Serve static files
app.use('/uploads', express.static(uploadDir));

// Root route
app.get('/', (req, res) => res.send('Welcome to the Express App!'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on ${BASE_URL}`);
  console.log(`Swagger docs available at ${BASE_URL}/api-docs`);
});

module.exports = app;
