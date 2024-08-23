const Trainer = require('../../models/Trainer/Trainer');
const Review = require('../../models/Trainer/Review'); // Assuming Review model exists
const Booking = require('../../models/Bookings/Booking'); // Assuming Booking model exists
const BookingDate = require('../../models/Bookings/BookingDate');
const User = require('../../models/User'); // Import the User model

// Create a new trainer
exports.createTrainer = async (req, res) => {
  try {
    const trainer = await Trainer.create(req.body);
    res.status(201).json(trainer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all trainers by category
exports.getTrainersByCategory = async (req, res) => {
  try {
    const trainers = await Trainer.findAll({ where: { categoryId: req.params.categoryId } });
    res.status(200).json(trainers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single trainer by ID
exports.getTrainerById = async (req, res) => {
  try {
    const trainer = await Trainer.findByPk(req.params.id);
    if (trainer) {
      res.status(200).json(trainer);
    } else {
      res.status(404).json({ message: 'Trainer not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all trainers
exports.getAllTrainers = async (req, res) => {
  try {
    const trainers = await Trainer.findAll({
      include: [
        {
          model: Review,
          attributes: ['rating', 'comment'],
        },
        {
          model: Booking,
          attributes: ['id'],
        },
      ],
    });

    const trainersWithRatings = trainers.map(trainer => {
      const reviews = trainer.Reviews || [];
      const averageRating = reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0;

      return {
        ...trainer.get({ plain: true }),
        averageRating,
        totalBookings: trainer.Bookings.length,
      };
    });

    res.status(200).json(trainersWithRatings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get trainer details
exports.getTrainerDetails = async (req, res) => {
  const { id } = req.params;
  const { date } = req.query; // Date provided from frontend

  // Default to today's date if no date is provided
  const today = new Date();
  const selectedDate = date ? date : today.toISOString().split('T')[0];

  // Calculate tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().split('T')[0];

  try {
    const trainer = await Trainer.findByPk(id, {
      include: [
        {
          model: Review,
          include: [{ model: User, attributes: ['username'] }],
        },
        {
          model: Booking,
          include: [
            {
              model: BookingDate,
              attributes: ['date', 'startTime', 'endTime'],
            },
          ],
        },
      ],
    });

    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }

    // Calculate the average rating for the trainer
    const reviews = trainer.Reviews || [];
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    // Calculate the total number of bookings
    const totalBookings = trainer.Bookings.length;

    // Generate dynamic availability for today and tomorrow from 08:00 to 20:00
    let availabilityToday = generateHourlySlots('08:00', '20:00'); // Availability for today
    let availabilityTomorrow = generateHourlySlots('08:00', '20:00'); // Availability for tomorrow

    // Remove booked slots for today
    trainer.Bookings.forEach(booking => {
      booking.BookingDates.forEach(bookingDate => {
        if (bookingDate.date === selectedDate) {
          availabilityToday = removeBookedSlots(availabilityToday, bookingDate.startTime, bookingDate.endTime);
        }
      });
    });

    // Remove booked slots for tomorrow
    trainer.Bookings.forEach(booking => {
      booking.BookingDates.forEach(bookingDate => {
        if (bookingDate.date === tomorrowDate) {
          availabilityTomorrow = removeBookedSlots(availabilityTomorrow, bookingDate.startTime, bookingDate.endTime);
        }
      });
    });

    res.status(200).json({
      trainer: trainer.get({ plain: true }),
      averageRating,
      totalBookings,
      reviews: trainer.Reviews,
      availabilityToday,
      availabilityTomorrow
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add a review for a specific trainer
exports.addReview = async (req, res) => {
  const { trainerId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id; // Assuming user ID is available through authentication middleware

  try {
    // Check if the trainer exists
    const trainer = await Trainer.findByPk(trainerId);
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }

    // Validate rating (ensure it's within the expected range, e.g., 1-5)
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Create the review
    const review = await Review.create({
      trainerId,
      userId,
      rating,
      comment
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cancel a booking
exports.cancelBooking = async (req, res) => {
  const { id } = req.params; // Booking ID

  try {
    // Find the booking by ID
    const booking = await Booking.findByPk(id, {
      include: [{
        model: BookingDate, // Include BookingDate to handle time slots
        attributes: ['date', 'startTime', 'endTime'],
      }]
    });

    // If booking not found, return an error
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Update the booking status to 'canceled'
    booking.status = 'canceled';
    await booking.save();

    console.log('Booking status after cancelation:', booking.status); // For debugging

    // Recalculate availability (Optional step, depending on how your system works)
    const trainerId = booking.trainerId; // Assuming booking has trainerId
    await recalculateTrainerAvailability(trainerId); // Custom function to recalculate availability (if needed)

    res.status(200).json({ message: 'Booking canceled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Example recalculateTrainerAvailability function to refresh availability
const recalculateTrainerAvailability = async (trainerId) => {
  try {
    const trainer = await Trainer.findByPk(trainerId, {
      include: [{
        model: Booking,
        include: [{
          model: BookingDate,
          attributes: ['date', 'startTime', 'endTime'],
        }],
        where: { status: 'active' }, // Only include active bookings
      }],
    });

    if (!trainer) {
      console.log('Trainer not found during availability recalculation.');
      return;
    }

    // Logic to recalculate the availability based on the remaining active bookings
    let availabilityToday = generateHourlySlots('08:00', '20:00');
    let availabilityTomorrow = generateHourlySlots('08:00', '20:00');
    let availabilitySelectedDate = generateHourlySlots('08:00', '20:00');

    trainer.Bookings.forEach(booking => {
      booking.BookingDates.forEach(bookingDate => {
        availabilityToday = removeBookedSlots(availabilityToday, bookingDate.startTime, bookingDate.endTime);
        availabilityTomorrow = removeBookedSlots(availabilityTomorrow, bookingDate.startTime, bookingDate.endTime);
        availabilitySelectedDate = removeBookedSlots(availabilitySelectedDate, bookingDate.startTime, bookingDate.endTime);
      });
    });

    console.log('Availability recalculated:', {
      availabilityToday,
      availabilityTomorrow,
      availabilitySelectedDate,
    });
  } catch (error) {
    console.log('Error recalculating availability:', error.message);
  }
};

// Get trainer bookings count
exports.getTrainerBookingsCount = async (req, res) => {
  try {
    const trainerId = req.params.trainerId;

    // Count bookings for the specific trainer
    const bookingCount = await Booking.count({
      where: { trainerId: trainerId }
    });

    res.status(200).json({ trainerId, bookingCount });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching the bookings count.' });
  }
};

function filterPastSlots(availability) {
  const now = new Date();
  const currentHour = now.getHours();  // Get the current hour
  const currentMinutes = now.getMinutes();  // Get the current minutes

  return availability.filter(slot => {
    const [slotHour, slotMinutes] = slot.startTime.split(':').map(Number);

    // Filter out slots that are in the past based on hours and minutes
    if (slotHour > currentHour) {
      return true; // Future hour
    } else if (slotHour === currentHour && slotMinutes >= currentMinutes) {
      return true; // Same hour but future minutes
    }

    return false; // Past slot
  });
}

function removeBookedSlots(availability, startTime, endTime) {
  return availability.filter(slot => {
    const slotStartTime = parseTime(slot.startTime);
    const slotEndTime = parseTime(slot.endTime);

    const bookedStartTime = parseTime(startTime);
    const bookedEndTime = parseTime(endTime);

    // Keep slots that don't overlap with booked slots
    return !(slotStartTime < bookedEndTime && slotEndTime > bookedStartTime);
  });
}

exports.getTrainerAvailability = async (req, res) => {
  const { id } = req.params;
  const { date } = req.query; // Optional date from frontend

  // Default to today's date if no date is provided
  const today = new Date();
  const selectedDate = date ? date : today.toISOString().split('T')[0];

  // Calculate tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().split('T')[0];

  try {
    const trainer = await Trainer.findByPk(id, {
      include: [
        {
          model: Booking,
          include: [
            {
              model: BookingDate,
              attributes: ['date', 'startTime', 'endTime'],
            },
          ],
        },
      ],
    });

    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }

    // Generate availability from 08:00 to 20:00 (8:00 AM to 8:00 PM)
    let availabilityToday = generateHourlySlots('08:00', '20:00');
    let availabilityTomorrow = generateHourlySlots('08:00', '20:00');
    let availabilitySelectedDate = generateHourlySlots('08:00', '20:00');

    // Filter out past slots for today's availability
    if (selectedDate === today.toISOString().split('T')[0]) {
      availabilityToday = filterPastSlots(availabilityToday); // Remove past slots
    }

    // Remove booked slots for today
    trainer.Bookings.forEach(booking => {
      booking.BookingDates.forEach(bookingDate => {
        if (bookingDate.date === today.toISOString().split('T')[0]) {
          availabilityToday = removeBookedSlots(availabilityToday, bookingDate.startTime, bookingDate.endTime);
        }
      });
    });

    // Remove booked slots for tomorrow
    trainer.Bookings.forEach(booking => {
      booking.BookingDates.forEach(bookingDate => {
        if (bookingDate.date === tomorrowDate) {
          availabilityTomorrow = removeBookedSlots(availabilityTomorrow, bookingDate.startTime, bookingDate.endTime);
        }
      });
    });

    // Return the response with filtered availability
    res.status(200).json({
      availabilityToday,
      availabilityTomorrow,
      availabilitySelectedDate,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper function to parse time (e.g., '08:30') into a comparable format (e.g., 830)
function parseTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 100 + minutes;
}

// Helper function to generate hourly slots
function generateHourlySlots(startTime, endTime) {
  const slots = [];
  let currentTime = parseTime(startTime);

  const endTimeComparable = parseTime(endTime);

  while (currentTime < endTimeComparable) {
    const hours = Math.floor(currentTime / 100).toString().padStart(2, '0');
    const minutes = (currentTime % 100).toString().padStart(2, '0');
    
    const nextTime = currentTime + 100;

    const nextHours = Math.floor(nextTime / 100).toString().padStart(2, '0');
    const nextMinutes = (nextTime % 100).toString().padStart(2, '0');

    slots.push({
      startTime: `${hours}:${minutes}`,
      endTime: `${nextHours}:${nextMinutes}`
    });

    currentTime += 100; // Move to the next hour
  }

  return slots;
}
