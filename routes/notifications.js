// routes/notificationRoutes.js

const express = require('express');
const router = express.Router();
const { getNotifications, addNotification } = require('../controllers/notificationController');

// Route to get notifications for a specific user
router.get('/:userId', getNotifications);

// Route to add a notification for testing
router.post('/add', addNotification);

module.exports = router;
