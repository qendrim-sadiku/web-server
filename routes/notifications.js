// routes/notificationRoutes.js

const express = require('express');
const router = express.Router();
const { getUserNotifications, addNotification ,saveFCMToken,markNotificationAsViewed,markAllNotificationsAsViewed} = require('../controllers/notificationController');

router.post('/save-fcm-token', saveFCMToken);

router.get('/:userId', getUserNotifications);


// Route to add a notification for testing
router.post('/add', addNotification);

router.put('/viewed/:notificationId', markNotificationAsViewed); // Mark single as viewed
router.put('/viewed/all/:userId', markAllNotificationsAsViewed); 



module.exports = router;
