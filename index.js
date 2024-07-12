const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const sequelize = require('./config/sequelize');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Routes
app.use('/auth', authRoutes);
app.use('/api/', userRoutes); // Mount user routes


// Database synchronization
sequelize.sync().then(() => {
  console.log('Database synced');
}).catch(err => {
  console.error('Database sync error:', err);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});