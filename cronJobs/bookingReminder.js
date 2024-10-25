const cron = require('node-cron');
const { Op } = require('sequelize');
const moment = require('moment');
const BookingDate = require('../models/Bookings/BookingDate'); 
const Booking = require('../models/Bookings/Booking'); 
const User = require('../models/User'); 
const {Service} = require('../models/Services/Service'); 

// Helper function to send a message
const sendNotification = (userId, message) => {
  console.log(`Sending message to User ID: ${userId} - ${message}`);
};

// Cron job that runs every minute
cron.schedule('* * * * *', async () => {
  try {
    const now = moment();

    // Define time intervals for reminders
    const reminders = [
      now.clone().add(1, 'hour').format('YYYY-MM-DD HH:mm'),
      now.clone().add(30, 'minutes').format('YYYY-MM-DD HH:mm'),
      now.clone().add(15, 'minutes').format('YYYY-MM-DD HH:mm'),
    ];

    // Get upcoming bookings
    const upcomingBookings = await BookingDate.findAll({
      where: {
        startTime: {
          [Op.in]: reminders,
        },
      },
      include: [
        {
          model: Booking,
          attributes: ['userId', 'serviceId'],
        },
      ],
    });

    // Process each booking
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
      const startDateTime = moment(`${bookingDate.date}T${bookingDate.startTime}`);
      const minutesLeft = Math.round(moment.duration(startDateTime.diff(now)).asMinutes());

      const message = `Hello ${userName}, your session "${bookingName}" will start in ${minutesLeft} minutes.`;

      // Send notification
      sendNotification(booking.userId, message);
    }

    console.log(`Checked bookings at ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});

module.exports = cron;
