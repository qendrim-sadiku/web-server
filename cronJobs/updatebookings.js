const cron = require('node-cron');
const moment = require('moment-timezone');
const { Op } = require('sequelize');
const BookingDate = require('../models/Bookings/BookingDate');
const Booking = require('../models/Bookings/Booking');

const timezone = 'Europe/Berlin'; // Set your preferred timezone

// Cron job that runs every minute
cron.schedule('* * * * *', async () => {
  try {
    const now = moment().tz(timezone);
    console.log(`[${now.format('YYYY-MM-DD HH:mm:ss')}] - Checking and updating booking statuses...`);

    // Fetch all bookings with their associated BookingDates
    const bookings = await Booking.findAll({
      where: {
        status: { [Op.not]: 'canceled' }, // Exclude bookings with status 'canceled'
      },
      include: [
        {
          model: BookingDate,
          attributes: ['date', 'startTime', 'endTime'],
        },
      ],
    });

    for (const booking of bookings) {
      let hasFutureDate = false;
      let isCurrentBooking = false;

      // Check each associated BookingDate
      for (const bookingDate of booking.BookingDates) {
        const bookingStartDateTime = moment.tz(`${bookingDate.date}T${bookingDate.startTime}`, timezone);
        const bookingEndDateTime = moment.tz(`${bookingDate.date}T${bookingDate.endTime}`, timezone);

        if (bookingEndDateTime.isAfter(now)) {
          if (bookingStartDateTime.isBefore(now)) {
            // The booking is currently ongoing
            isCurrentBooking = true;
          } else {
            // The booking is in the future
            hasFutureDate = true;
          }
        }
      }

      // Update booking status based on the date checks
      if (hasFutureDate && booking.status === 'completed') {
        console.log(`Booking ID ${booking.id} has future dates. Updating status to 'active'.`);
        booking.status = 'active';
        await booking.save();
      } else if (!hasFutureDate && !isCurrentBooking && booking.status !== 'completed') {
        console.log(`Booking ID ${booking.id} has all dates in the past. Updating status to 'completed'.`);
        booking.status = 'completed';
        await booking.save();
      }
    }

    console.log(`[${now.format('YYYY-MM-DD HH:mm:ss')}] - Booking status check complete.`);
  } catch (error) {
    console.error('Error in booking status cron job:', error.message);
  }
});
