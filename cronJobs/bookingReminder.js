// const cron = require('node-cron');
// const moment = require('moment-timezone');
// const { Op } = require('sequelize');
// const BookingDate = require('../models/Bookings/BookingDate');
// const Booking = require('../models/Bookings/Booking');
// const User = require('../models/User');
// const { Service } = require('../models/Services/Service');
// const Notification = require('../models/Notifications');
// const admin = require('../config/firebase'); // Import your Firebase Admin setup

// // Set your preferred timezone (e.g., 'Europe/Berlin')
// const timezone = 'Europe/Berlin';

// // Function to validate FCM token structure
// function isValidFCMToken(token) {
//   const fcmTokenRegex = /^[A-Za-z0-9\-_]+:[A-Za-z0-9\-_]+$/;
//   const isValidStructure = fcmTokenRegex.test(token);
//   const isValidLength = token.length >= 140 && token.length <= 160;
//   return isValidStructure && isValidLength;
// }

// // Function to send FCM notification with detailed logging
// const sendFCMNotification = async (id, title, message) => {
//   try {
//     const user = await User.findByPk(id, { attributes: ['fcmToken'] });

//     if (user && user.fcmToken) {
//       console.log(`User ID: ${id} - Retrieved FCM Token: ${user.fcmToken}`);

//       // Validate the FCM token structure before sending
//       if (!isValidFCMToken(user.fcmToken)) {
//         console.error(`User ID: ${id} - Invalid FCM Token Format: ${user.fcmToken}`);
//         return;
//       }

//       const messagePayload = {
//         token: user.fcmToken,
//         notification: {
//           title: title,
//           body: message,
//         },
//       };

//       console.log(`User ID: ${id} - Notification Payload:`, messagePayload);

//       // Send the notification
//       const response = await admin.messaging().send(messagePayload);
//       console.log(`User ID: ${id} - Notification sent successfully. Response: ${response}`);
//     } else {
//       console.log(`User ID: ${id} - No FCM token found.`);
//     }
//   } catch (error) {
//     console.error(`User ID: ${id} - Error sending FCM notification:`, error);
//   }
// };

// // Cron job that runs every minute
// cron.schedule('* * * * *', async () => {
//   try {
//     const now = moment().tz(timezone);
//     const oneHourLater = now.clone().add(1, 'hour');
//     const today = now.format('YYYY-MM-DD');

//     console.log(`\n[${now.format('YYYY-MM-DD HH:mm:ss')}] - Checking bookings in timezone: ${timezone}`);

//     // Get bookings that start within the next hour based on the correct timezone
//     const upcomingBookings = await BookingDate.findAll({
//       where: {
//         date: today,
//         startTime: {
//           [Op.between]: [
//             now.format('HH:mm'),
//             oneHourLater.format('HH:mm'),
//           ],
//         },
//       },
//       include: [
//         {
//           model: Booking,
//           attributes: ['userId', 'serviceId'],
//         },
//       ],
//     });

//     console.log(`Found ${upcomingBookings.length} upcoming booking(s).`);

//     for (const bookingDate of upcomingBookings) {
//       const booking = bookingDate.Booking;

//       if (!booking) {
//         console.warn(`BookingDate ID: ${bookingDate.id} - No associated Booking found.`);
//         continue;
//       }

//       const user = await User.findByPk(booking.userId, {
//         attributes: ['name', 'fcmToken'],
//       });

//       if (!user) {
//         console.warn(`Booking ID: ${booking.id} - No associated User found.`);
//         continue;
//       }

//       const service = await Service.findByPk(booking.serviceId, {
//         attributes: ['name'],
//       });

//       if (!service) {
//         console.warn(`Booking ID: ${booking.id} - No associated Service found.`);
//         continue;
//       }

//       const userName = user.name || 'User';
//       const bookingName = service.name || 'Service';
//       const startDateTime = moment.tz(`${bookingDate.date}T${bookingDate.startTime}`, timezone);
//       const minutesLeft = Math.round(moment.duration(startDateTime.diff(now)).asMinutes());

//       console.log(`\nProcessing Booking ID: ${booking.id}`);
//       console.log(`User: ${userName} (ID: ${user.id})`);
//       console.log(`Service: ${bookingName}`);
//       console.log(`Session Start Time: ${startDateTime.format('YYYY-MM-DD HH:mm:ss')}`);
//       console.log(`Minutes Left: ${minutesLeft}`);

//       const title = 'Upcoming Session Reminder';
//       const message = `Hello ${userName}, your session "${bookingName}" will start in ${minutesLeft} minutes.`;
//       const imageUrl = ''; // Optional: Add an image URL if needed

//       // Save the notification in the database
//       const notificationRecord = await Notification.create({
//         userId: booking.userId,
//         title,
//         message,
//         imageUrl,
//       });

//       console.log(`Notification Record ID: ${notificationRecord.id} - Saved to database.`);

//       // Send the notification via FCM
//       await sendFCMNotification(booking.userId, title, message);
//     }

//   } catch (error) {
//     console.error('Error in cron job:', error);
//   }
// });
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

// Track the last notification time
let lastNotificationTime = null;

// Function to validate FCM token structure
function isValidFCMToken(token) {
  const fcmTokenRegex = /^[A-Za-z0-9\-_]+:[A-Za-z0-9\-_]+$/;
  const isValidStructure = fcmTokenRegex.test(token);
  const isValidLength = token.length >= 140 && token.length <= 160;
  return isValidStructure && isValidLength;
}

// Function to send FCM notification with detailed logging
const sendFCMNotification = async (id, title, message) => {
  try {
    const user = await User.findByPk(id, { attributes: ['fcmToken'] });

    if (user && user.fcmToken) {
      console.log(`User ID: ${id} - Retrieved FCM Token: ${user.fcmToken}`);

      // Validate the FCM token structure before sending
      if (!isValidFCMToken(user.fcmToken)) {
        console.error(`User ID: ${id} - Invalid FCM Token Format: ${user.fcmToken}`);
        return;
      }

      const messagePayload = {
        token: user.fcmToken,
        notification: {
          title: title,
          body: message,
        },
      };

      console.log(`User ID: ${id} - Notification Payload:`, messagePayload);

      // Send the notification
      const response = await admin.messaging().send(messagePayload);
      console.log(`User ID: ${id} - Notification sent successfully. Response: ${response}`);
    } else {
      console.log(`User ID: ${id} - No FCM token found.`);
    }
  } catch (error) {
    console.error(`User ID: ${id} - Error sending FCM notification:`, error);
  }
};

// Cron job that runs every minute
cron.schedule('* * * * *', async () => {
  try {
    const now = moment().tz(timezone);
    const oneHourLater = now.clone().add(1, 'hour');
    const today = now.format('YYYY-MM-DD');

    // Check if 5 minutes have passed since the last notification
    if (lastNotificationTime && now.diff(lastNotificationTime, 'minutes') < 5) {
      console.log("Less than 5 minutes since the last notification. Skipping...");
      return;
    }

    console.log(`\n[${now.format('YYYY-MM-DD HH:mm:ss')}] - Checking bookings in timezone: ${timezone}`);

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

    console.log(`Found ${upcomingBookings.length} upcoming booking(s).`);

    for (const bookingDate of upcomingBookings) {
      const booking = bookingDate.Booking;

      if (!booking) {
        console.warn(`BookingDate ID: ${bookingDate.id} - No associated Booking found.`);
        continue;
      }

      const user = await User.findByPk(booking.userId, {
        attributes: ['name', 'fcmToken'],
      });

      if (!user) {
        console.warn(`Booking ID: ${booking.id} - No associated User found.`);
        continue;
      }

      const service = await Service.findByPk(booking.serviceId, {
        attributes: ['name'],
      });

      if (!service) {
        console.warn(`Booking ID: ${booking.id} - No associated Service found.`);
        continue;
      }

      const userName = user.name || 'User';
      const bookingName = service.name || 'Service';
      const startDateTime = moment.tz(`${bookingDate.date}T${bookingDate.startTime}`, timezone);
      const minutesLeft = Math.round(moment.duration(startDateTime.diff(now)).asMinutes());

      console.log(`\nProcessing Booking ID: ${booking.id}`);
      console.log(`User: ${userName} (ID: ${user.id})`);
      console.log(`Service: ${bookingName}`);
      console.log(`Session Start Time: ${startDateTime.format('YYYY-MM-DD HH:mm:ss')}`);
      console.log(`Minutes Left: ${minutesLeft}`);

      const title = 'Upcoming Session Reminder';
      const message = `Hello ${userName}, your session "${bookingName}" will start in ${minutesLeft} minutes.`;
      const imageUrl = ''; // Optional: Add an image URL if needed

      // Save the notification in the database
      const notificationRecord = await Notification.create({
        userId: booking.userId,
        title,
        message,
        imageUrl,
      });

      console.log(`Notification Record ID: ${notificationRecord.id} - Saved to database.`);

      // Send the notification via FCM
      await sendFCMNotification(booking.userId, title, message);
    }

    // Update the last notification time
    lastNotificationTime = now;

  } catch (error) {
    console.error('Error in cron job:', error);
  }
});
