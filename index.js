// app.js

require('dotenv').config(); // Load environment variables

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const jtwConfig = require('./config/jwtconf'); // Ensure this path is correct

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const serviceRoutes = require('./routes/services/servicesRoutes');
const bookingRoutes = require('./routes/bookings/bookingRoutes');
const trainerRoutes = require('./routes/trainer/trainerRoutes');
const locationRoutes = require('./routes/locationRoutes');

// Import Sequelize instance
const sequelize = require('./config/sequelize');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, {
  cors: {
    origin: [
      'http://localhost:4200',       // Angular development server
      'capacitor://localhost',       // Default Capacitor origin for mobile apps
      'http://localhost',            // Localhost for additional testing
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});


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

// Routes
app.use('/auth', authRoutes);        // Authentication routes
app.use('/api', userRoutes);         // User routes
app.use('/countries', locationRoutes); // Location routes
app.use('/api/services', serviceRoutes); // Service routes
app.use('/api', bookingRoutes);      // Booking routes
app.use('/api/trainers', trainerRoutes); // Trainer routes
app.use('/api', categoryRoutes);     // Category routes

// Serve static files from the uploads directory
app.use('/uploads', express.static(uploadDir));

// Root route to send a message when visiting the app
app.get('/', (req, res) => {
  res.send('Welcome to the Express App!');
});

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.query.token;

  if (token) {
    jwt.verify(token, jtwConfig.jwtSecret, (err, decoded) => {
      if (err) {
        console.log('Socket authentication error:', err.message);
        return next(new Error('Authentication error'));
      } else {
        socket.userId = decoded.id;
        console.log(`Authenticated user ${socket.userId} via Socket.IO`);
        next();
      }
    });
  } else {
    console.log('No token provided for Socket.IO connection');
    return next(new Error('Authentication error'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected via Socket.IO`);

  // Join user-specific room
  socket.join(`user_${socket.userId}`);
  console.log(`User ${socket.userId} joined room: user_${socket.userId}`);

  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected from Socket.IO`);
  });
});

// Import and initialize the cron job after Socket.IO is set up
const initializeCronJob = require('./cronJobs/bookingReminder');
initializeCronJob(io);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Export the app and io for use in other modules
module.exports = { app, io };
