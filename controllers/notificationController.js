const Notification = require('../models/Notifications');
const userNotifications = new Map(); // Shared in-memory storage using Map

// Fetch notifications for a specific user from both in-memory and the database
const getNotifications = async (req, res) => {
  const userId = req.params.userId.toString(); // Ensure userId is treated as a string

  try {
    // Get notifications from the in-memory store
    const memoryNotifications = userNotifications.get(userId) || [];

    // Get notifications from the database
    const dbNotifications = await Notification.findAll({
      where: { userId },
      order: [['timestamp', 'DESC']],
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
  const userId = req.body.userId.toString(); // Ensure userId is treated as a string
  const message = req.body.message;

  // Initialize user's notification array if it doesn't exist
  if (!userNotifications.has(userId)) {
    userNotifications.set(userId, []);
  }

  // Push new notification to user's array (in-memory)
  userNotifications.get(userId).push({ message, timestamp: new Date() });

  // Also save the notification in the database
  try {
    await Notification.create({
      userId,
      title: 'Test Notification',
      message,
      imageUrl: '', // Add an image URL if necessary
    });

    res.json({ message: 'Notification added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding notification', error });
  }
};

module.exports = { getNotifications, addNotification, userNotifications };
