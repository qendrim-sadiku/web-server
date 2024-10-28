// routes/notificationRoutes.js

const express = require('express');
const router = express.Router();
const { getNotifications, addNotification ,saveFCMToken} = require('../controllers/notificationController');

router.post('/save-fcm-token', saveFCMToken);

// Route to get notifications for a specific user
router.get('/:userId', getNotifications);

// Route to add a notification for testing
router.post('/add', addNotification);

module.exports = router;
