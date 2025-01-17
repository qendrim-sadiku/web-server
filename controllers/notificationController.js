const Notification = require('../models/Notifications');
const User = require('../models/User');
const userNotifications = new Map(); // Shared in-memory storage using Map

// Fetch notifications for a specific user from both in-memory and the database
const getUserNotifications = async (req, res) => {
  const userId = req.params.userId.toString(); // Ensure userId is treated as a string

  try {
    // Get notifications from the in-memory store
    const memoryNotifications = userNotifications.get(userId) || [];

    // Get notifications from the database, including startTime
    const dbNotifications = await Notification.findAll({
      where: { userId },
      order: [['timestamp', 'DESC']],
      attributes: ['id', 'userId', 'title', 'message', 'imageUrl', 'timestamp', 'isViewed', 'startTime'],
    });

    // Combine in-memory and database notifications
    const allNotifications = [...memoryNotifications, ...dbNotifications];

    // Clear in-memory notifications after fetching
    userNotifications.set(userId, []);

    res.json({ notifications: allNotifications });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error });
  }
};


// Add a notification for a specific user (for testing purposes)
const addNotification = async (req, res) => {
  const userId = req.body.userId.toString();
  const message = req.body.message;

  // Fetch the user's FCM token from the database (if stored)
  const user = await User.findByPk(userId, { attributes: ['fcmToken'] });

  if (user && user.fcmToken) {
    const payload = {
      notification: {
        title: 'Test Notification',
        body: message,
      },
    };

    try {
      // Send the notification to the user's device using FCM
      await admin.messaging().sendToDevice(user.fcmToken, payload);
      console.log('Push notification sent successfully');
    } catch (error) {
      console.error('Error sending FCM notification:', error);
    }
  } else {
    console.log('No FCM token available for this user.');
  }

  // Save the notification in the database
  try {
    await Notification.create({
      userId,
      title: 'Test Notification',
      message,
      imageUrl: '',
    });

    res.json({ message: 'Notification added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding notification', error });
  }
};


const markNotificationAsViewed = async (req, res) => {
  const notificationId = req.params.notificationId;

  try {
    const [updatedRows] = await Notification.update(
      { isViewed: true },
      { where: { id: notificationId } }
    );

    if (updatedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as viewed' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking notification as viewed', error });
  }
};

const markAllNotificationsAsViewed = async (req, res) => {
  const userId = req.params.userId;

  try {
    const [updatedRows] = await Notification.update(
      { isViewed: true },
      { where: { userId } }
    );

    if (updatedRows === 0) {
      return res.status(404).json({ message: 'No notifications found for this user' });
    }

    res.json({ message: 'All notifications marked as viewed' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking all notifications as viewed', error });
  }
};


const saveFCMToken = async (req, res) => {
  const { userId, fcmToken } = req.body;

  try {
    // Update the user's FCM token in the database
    await User.update({ fcmToken }, { where: { id: userId } });
    res.status(200).json({ message: 'FCM token saved successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error saving FCM token', error });
  }
};


module.exports = { getUserNotifications, addNotification, userNotifications ,saveFCMToken, markNotificationAsViewed,
  markAllNotificationsAsViewed};
