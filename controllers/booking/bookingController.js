// const { Booking, Participant, BookingDate } = require('../../models/Booking');
const Booking = require('../../models/Bookings/Booking');
const Participant = require('../../models/Bookings/Participant');
const BookingDate = require('../../models/Bookings/BookingDate');
const  Trainer  = require('../../models/Trainer/Trainer');

const { Service } = require('../../models/Services/Service');


// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const { userId, serviceId, trainerId, address, participants, dates } = req.body;

    // Ensure dates array is not empty
    if (!dates || dates.length === 0) {
      return res.status(400).json({ message: 'Booking dates are required' });
    }

    // Fetch the trainer to get the hourly rate
    const trainer = await Trainer.findByPk(trainerId);
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }

    // Calculate total price based on the number of dates and the trainer's hourly rate
    const totalPrice = dates.length * trainer.hourlyRate;

    console.log(`Dates: ${dates.length}, Hourly Rate: ${trainer.hourlyRate}, Total Price: ${totalPrice}`);

    const booking = await Booking.create({
      userId,
      serviceId,
      trainerId,
      address,
      totalPrice
    });

    // Add participants (if any)
    if (participants && participants.length > 0) {
      const participantData = participants.map(participant => ({
        ...participant,
        bookingId: booking.id
      }));
      await Participant.bulkCreate(participantData);
    }

    // Add dates
    if (dates && dates.length > 0) {
      const dateData = dates.map(date => ({
        ...date,
        bookingId: booking.id
      }));
      await BookingDate.bulkCreate(dateData);
    }

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.error(error);
  }
};

  
  // Get all bookings of a user
  exports.getAllBookingsOfUser = async (req, res) => {
    try {
      const { userId } = req.params;
      const bookings = await Booking.findAll({
        where: { userId },
        include: [
          { model: Participant },
          { model: BookingDate },
          { model: Service },
          { model: Trainer }
        ]
      });
      res.status(200).json(bookings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  // Get a single booking by ID
  exports.getBookingById = async (req, res) => {
    try {
      const { id } = req.params;
      const booking = await Booking.findByPk(id, {
        include: [
          { model: Participant },
          { model: BookingDate },
          { model: Service },
          { model: Trainer }
        ]
      });
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      res.status(200).json(booking);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  // Edit a booking
  exports.editBooking = async (req, res) => {
    try {
      const { id } = req.params;
      const { address, participants, dates } = req.body;
  
      const booking = await Booking.findByPk(id);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
  
      booking.address = address || booking.address;
  
      // Update participants
      if (participants && participants.length > 0) {
        await Participant.destroy({ where: { bookingId: id } });
        const participantData = participants.map(participant => ({
          ...participant,
          bookingId: id
        }));
        await Participant.bulkCreate(participantData);
      }
  
      // Update dates
      if (dates && dates.length > 0) {
        await BookingDate.destroy({ where: { bookingId: id } });
        const dateData = dates.map(date => ({
          ...date,
          bookingId: id
        }));
        await BookingDate.bulkCreate(dateData);
      }
  
      await booking.save();
      res.status(200).json(booking);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  // // Delete a booking
  // exports.deleteBooking = async (req, res) => {
  //   try {
  //     const { id } = req.params;
  
  //     const booking = await Booking.findByPk(id);
  //     if (!booking) {
  //       return res.status(404).json({ message: 'Booking not found' });
  //     }
  
  //     await Participant.destroy({ where: { bookingId: id } });
  //     await BookingDate.destroy({ where: { bookingId: id } });
  //     await booking.destroy();
  
  //     res.status(200).json({ message: 'Booking deleted successfully' });
  //   } catch (error) {
  //     res.status(500).json({ error: error.message });
  //   }
  // };

// Cancel a booking
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params; // Extract the booking ID from the request parameters

    // Find the booking by its ID
    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' }); // Return 404 if the booking is not found
    }

    // Update the status of the booking to 'canceled'
    booking.status = 'canceled';
    await booking.save(); // Save the updated booking

    res.status(200).json({ message: 'Booking canceled successfully' }); // Return success message
  } catch (error) {
    res.status(500).json({ error: error.message }); // Handle any errors that occur during the process
  }
};




  exports.getUserBookings = async (req, res) => {
    try {
      const userId = req.user.id; // Assuming the user ID is obtained from authenticated user
      const currentDate = new Date(); // Get the current date
  
      // Fetch bookings with related services and trainers
      const bookings = await Booking.findAll({
        where: { userId },
        include: [
          {
            model: Service,
            attributes: ['id', 'name', 'description', 'image', 'duration', 'hourlyRate', 'level'],
            include: [
              {
                model: SubCategory,
                attributes: ['id', 'name'],
                include: [
                  {
                    model: Category,
                    attributes: ['id', 'name'],
                  },
                ],
              },
              {
                model: Trainer,
                attributes: ['id', 'name'],
                through: { attributes: [] }, // Many-to-many relationship without including junction table attributes
              },
            ],
          },
        ],
      });
  
      // Categorize bookings
      const categorizedBookings = {
        upcoming: [],
        past: [],
        canceled: [],
      };
  
      bookings.forEach(booking => {
        const bookingDate = new Date(booking.date); // Assuming booking has a date field
        if (booking.status === 'canceled') {
          categorizedBookings.canceled.push(booking);
        } else if (bookingDate > currentDate) {
          categorizedBookings.upcoming.push(booking);
        } else {
          categorizedBookings.past.push(booking);
        }
      });
  
      res.status(200).json(categorizedBookings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };