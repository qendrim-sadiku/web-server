const cron = require('node-cron');
const moment = require('moment-timezone');
const { Op } = require('sequelize');
const BookingDate = require('../models/Bookings/BookingDate');
const Booking = require('../models/Bookings/Booking');
const User = require('../models/User');
const { Service } = require('../models/Services/Service');
const Notification = require('../models/Notifications');
const admin = require('../config/firebase'); // Import your Firebase Admin setup

// Set your preferred timezone (e.g., 'Europe/Berlin')
const timezone = 'Europe/Berlin';

const sendFCMNotification = async (userId, title, message) => {
  try {
    const user = await User.findByPk(userId, { attributes: ['fcmToken'] });

    if (user && user.fcmToken) {
      const messagePayload = {
        token: user.fcmToken,
        notification: {
          title: title,
          body: message,
        },
      };

      // Send the notification
      await admin.messaging().send(messagePayload);
      console.log(`Notification sent to User ID: ${userId}`);
    } else {
      console.log(`No FCM token found for User ID: ${userId}`);
    }
  } catch (error) {
    console.error('Error sending FCM notification:', error);
  }
};


// Cron job that runs every minute
cron.schedule('* * * * *', async () => {
  try {
    const now = moment().tz(timezone);
    const oneHourLater = now.clone().add(1, 'hour');
    const today = now.format('YYYY-MM-DD');

    console.log(`Checked bookings at ${now.format('YYYY-MM-DD HH:mm:ss')} in timezone: ${timezone}`);

    // Get bookings that start within the next hour based on the correct timezone
    const upcomingBookings = await BookingDate.findAll({
      where: {
        date: today,
        startTime: {
          [Op.between]: [
            now.format('HH:mm'),
            oneHourLater.format('HH:mm'),
          ],
        },
      },
      include: [
        {
          model: Booking,
          attributes: ['userId', 'serviceId'],
        },
      ],
    });

    for (const bookingDate of upcomingBookings) {
      const booking = bookingDate.Booking;
      const user = await User.findByPk(booking.userId, {
        attributes: ['name', 'fcmToken'],
      });
      const service = await Service.findByPk(booking.serviceId, {
        attributes: ['name'],
      });

      const userName = user ? user.name : 'User';
      const bookingName = service ? service.name : 'Service';
      const startDateTime = moment.tz(`${bookingDate.date}T${bookingDate.startTime}`, timezone);
      const minutesLeft = Math.round(moment.duration(startDateTime.diff(now)).asMinutes());

      const title = 'Upcoming Session Reminder';
      const message = `Hello ${userName}, your session "${bookingName}" will start in ${minutesLeft} minutes.`;
      const imageUrl = ''; // Optional: Add an image URL if needed

      // Save the notification in the database
      await Notification.create({
        userId: booking.userId,
        title,
        message,
        imageUrl,
      });

      // Send the notification via FCM
      await sendFCMNotification(booking.userId, title, message);
    }

  } catch (error) {
    console.error('Error in cron job:', error);
  }
});
