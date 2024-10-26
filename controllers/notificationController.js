// controllers/notificationController.js

const userNotifications = new Map(); // Shared in-memory storage using Map

// Fetch notifications for a specific user
const getNotifications = (req, res) => {
  const userId = req.params.userId.toString(); // Ensure userId is treated as a string

  // Get notifications for the user, or return an empty array if none exist
  const notifications = userNotifications.get(userId) || [];

  // Clear notifications after fetching
  userNotifications.set(userId, []);

  res.json({ notifications });
};

// Add a notification for a specific user (for testing purposes)
const addNotification = (req, res) => {
  const userId = req.body.userId.toString(); // Ensure userId is treated as a string
  const message = req.body.message;

  // Initialize user's notification array if it doesn't exist
  if (!userNotifications.has(userId)) {
    userNotifications.set(userId, []);
  }

  // Push new notification to user's array
  userNotifications.get(userId).push({ message, timestamp: new Date() });

  res.json({ message: 'Notification added successfully' });
};

module.exports = { getNotifications, addNotification, userNotifications };
