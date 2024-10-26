// cronJobs/bookingReminder.js

const cron = require('node-cron');
const moment = require('moment');
const { Op } = require('sequelize');
const BookingDate = require('../models/Bookings/BookingDate');
const Booking = require('../models/Bookings/Booking');
const User = require('../models/User');
const { Service } = require('../models/Services/Service');
const { userNotifications } = require('../controllers/notificationController');

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
    const now = moment();
    const oneHourLater = now.clone().add(1, 'hour');
    const today = now.format('YYYY-MM-DD');

    // Get bookings that start within the next hour
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
        attributes: ['name'],
      });
      const service = await Service.findByPk(booking.serviceId, {
        attributes: ['name'],
      });

      const userName = user ? user.name : 'User';
      const bookingName = service ? service.name : 'Service';
      const startDateTime = moment(`${bookingDate.date}T${bookingDate.startTime}`);
      const minutesLeft = Math.round(moment.duration(startDateTime.diff(now)).asMinutes());

      // Send a reminder message only for bookings within 1 hour
      const message = `Hello ${userName}, your session "${bookingName}" will start in ${minutesLeft} minutes.`;
      sendNotification(booking.userId, message);
    }
    console.log(`Checked bookings at ${now.format('YYYY-MM-DD HH:mm:ss')}`);
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});
