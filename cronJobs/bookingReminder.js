// cronJobs/bookingReminder.js

const cron = require('node-cron');
const moment = require('moment');
const { Op } = require('sequelize');
const BookingDate = require('../models/Bookings/BookingDate');
const Booking = require('../models/Bookings/Booking');
const User = require('../models/User');
const { Service } = require('../models/Services/Service');
const { userNotifications } = require('../controllers/notificationController');
// Set your preferred timezone (e.g., 'Europe/London', 'America/New_York', etc.)
const timezone = 'Europe/Berlin'; // Replace with your local timezone

const sendNotification = (userId, message) => {
  console.log(`Sending message to User ID: ${userId} - ${message}`);

  const userIdStr = userId.toString();

  if (!userNotifications.has(userIdStr)) {
    userNotifications.set(userIdStr, []);
  }

  userNotifications.get(userIdStr).push({
    message,
    timestamp: moment().format('YYYY-MM-DD HH:mm:ss')
  });
};



// Cron job that runs every minute
cron.schedule('* * * * *', async () => {
  try {
    // Get the current time in the desired timezone
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
            now.format('HH:mm'),           // Current time
            oneHourLater.format('HH:mm'),  // One hour from now
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

    // Process each booking as before
    for (const bookingDate of upcomingBookings) {
      const booking = bookingDate.Booking;

      // Fetch user and service details separately
      const user = await User.findByPk(booking.userId, {
        attributes: ['name'],
      });
      const service = await Service.findByPk(booking.serviceId, {
        attributes: ['name'],
      });
      const userName = user ? user.name : 'User';
      const bookingName = service ? service.name : 'Service';

      // Calculate time left until the session
      const startDateTime = moment.tz(`${bookingDate.date}T${bookingDate.startTime}`, timezone);
      const minutesLeft = Math.round(moment.duration(startDateTime.diff(now)).asMinutes());

      // Send a reminder message only for bookings within the time frame
      const message = `Hello ${userName}, your session "${bookingName}" will start in ${minutesLeft} minutes.`;
      sendNotification(booking.userId, message);
    }

  } catch (error) {
    console.error('Error in cron job:', error);
  }
});