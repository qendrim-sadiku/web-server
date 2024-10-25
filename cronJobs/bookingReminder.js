// bookingReminder.js

const cron = require('node-cron');
const { Op } = require('sequelize');
const moment = require('moment-timezone');

const BookingDate = require('../models/Bookings/BookingDate'); 
const Booking = require('../models/Bookings/Booking'); 
const User = require('../models/User'); 
const { Service } = require('../models/Services/Service'); 

// Helper function to send a message via Socket.IO
const sendNotification = (ioInstance, userId, notificationData) => {
  // Emit the notification to the specific user room
  ioInstance.to(`user_${userId}`).emit('bookingReminder', notificationData);
  console.log(`Sending message to User ID: ${userId} - ${notificationData.message}`);
};

// Function to initialize the cron job
const initializeCronJob = (ioInstance) => {
  // Cron job that runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      const timeZone = 'Europe/Zagreb'; // Croatia's Timezone
      const now = moment().tz(timeZone);
      const oneHourLater = now.clone().add(1, 'hour');

      // Log the cron job execution time
      console.log(`Cron job running at ${now.format('YYYY-MM-DD HH:mm:ss')} (${timeZone})`);

      // Get upcoming bookings within the next hour for the current day
      const upcomingBookings = await BookingDate.findAll({
        where: {
          date: now.format('YYYY-MM-DD'), // Only today's bookings
          startTime: {
            [Op.between]: [now.format('HH:mm:ss'), oneHourLater.format('HH:mm:ss')],
          },
        },
        include: [
          {
            model: Booking,
            attributes: ['id', 'userId', 'serviceId'],
          },
        ],
      });

      // Process each booking
      for (const bookingDate of upcomingBookings) {
        const booking = bookingDate.Booking;

        if (!booking) {
          console.warn(`No booking found for BookingDate ID: ${bookingDate.id}`);
          continue;
        }

        // Fetch user and service details
        const user = await User.findByPk(booking.userId, {
          attributes: ['name'],
        });
        const service = await Service.findByPk(booking.serviceId, {
          attributes: ['name'],
        });

        const userName = user ? user.name : 'User';
        const bookingName = service ? service.name : 'Service';

        // Calculate time left until the session
        const startDateTime = moment.tz(`${bookingDate.date} ${bookingDate.startTime}`, 'YYYY-MM-DD HH:mm:ss', timeZone);
        const minutesLeft = Math.round(moment.duration(startDateTime.diff(now)).asMinutes());

        if (minutesLeft >= 0 && minutesLeft <= 60) {
          const message = `Hello ${userName}, your session "${bookingName}" will start in ${minutesLeft} minutes.`;

          const notificationData = {
            message: message,
            booking: {
              id: booking.id,
              serviceName: bookingName,
              startTime: startDateTime.format('YYYY-MM-DD HH:mm:ss'),
            },
          };

          // Send notification via Socket.IO
          sendNotification(ioInstance, booking.userId, notificationData);
        }
      }

      console.log(`Checked bookings at ${now.format('YYYY-MM-DD HH:mm:ss')} (${timeZone})`);
    } catch (error) {
      console.error('Error in cron job:', error);
    }
  });

  console.log('Booking Reminder cron job initialized');
};

module.exports = initializeCronJob;
