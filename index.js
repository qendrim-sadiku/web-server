const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes'); // Adjust the path as necessary

const serviceRoutes = require('./routes/services/servicesRoutes');
const bookingRoutes = require('./routes/bookings/bookingRoutes');
const trainerRoutes = require('./routes/trainer/trainerRoutes');

const sequelize = require('./config/sequelize');
const cors = require('cors');
const locationRoutes = require('./routes/locationRoutes')
const fs = require('fs');
const path = require('path');



const app = express();
const PORT = process.env.PORT || 3000;

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
// sequelize.sync({ force: true }); // This will drop existing tables and recreate them

// Routes
app.use('/auth', authRoutes);
app.use('/api/', userRoutes); // Mount user routes
app.use('/countries', locationRoutes); // Mount user routes
// Use the trainer routes


app.use('/api/services', serviceRoutes);
app.use('/api/', bookingRoutes);
app.use('/api/trainers', trainerRoutes);


app.use('/api', categoryRoutes);

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// sequelize.sync({ alter: true })
//   .then(() => {
//     console.log("Database synchronized");
//   })
//   .catch(error => {
//     console.error("Error synchronizing database:", error);
//   });


  
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});