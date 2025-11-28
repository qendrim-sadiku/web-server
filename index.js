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

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const serviceRoutes = require('./routes/services/servicesRoutes');
const bookingRoutes = require('./routes/bookings/bookingRoutes');
const trainerRoutes = require('./routes/trainer/trainerRoutes');
const locationRoutes = require('./routes/locationRoutes');
const notificationRoutes = require('./routes/notifications');
const userInterestRoutes = require('./routes/userInterestRouter');
const groupSessionsRouter = require('./routes/groupSessions');
const recentSearchRoutes = require('./routes/recentSearchRoutes');
const subUserRoutes = require('./routes/subUserRoutes');
const googlePlacesRoutes = require('./routes/googlePlacesRoutes');

const http = require('http');
const { initSfuSignaling } = require('./sfu/signaling'); // ← only import this (no getWorker here)

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware setup
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

const allowedOrigins = [
  'http://localhost:4200',
  'https://aroit.com',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost'
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS not allowed from origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.options('*', cors());

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 3600000
    }
  })
);

// --- Create HTTP server so Socket.IO can attach ---
const server = http.createServer(app);

// --- Init SFU signaling (Socket.IO + mediasoup) WITH EXPLICIT SOCKET.IO CORS ---
initSfuSignaling(server, { allowedOrigins });

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
app.use('/', authRoutes);
app.use('/api', userRoutes);
// Direct route for reverse-geocode (registered before router to ensure it works)
const locationController = require('./controllers/locationController');
app.get('/countries/reverse-geocode', locationController.getAddressFromCoordinates);
app.use('/countries', locationRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api', bookingRoutes);
app.use('/api/', require('./routes/availabilityRoutes'));
app.use('/api/trainers', trainerRoutes);
app.use('/api', categoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/', userInterestRoutes);
app.use('/api/', recentSearchRoutes);
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

// --- START THE SERVER (use server.listen, not app.listen) ---
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on ${BASE_URL}`);
  console.log(`Swagger docs available at ${BASE_URL}/api-docs`);
});

module.exports = app;
