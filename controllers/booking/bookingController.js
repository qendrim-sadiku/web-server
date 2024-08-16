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

    let totalPrice = 0;

    // Validate and calculate total price based on the number of hours booked and the trainer's hourly rate
    for (let date of dates) {
      const { date: datePart, startTime, endTime } = date;

      if (!startTime || !endTime) {
        return res.status(400).json({ message: 'Start time and end time are required for each booking date' });
      }

      // Combine the date with the start and end times to create full Date objects
      const startDateTime = new Date(`${datePart}T${startTime}`);
      const endDateTime = new Date(`${datePart}T${endTime}`);

      // Ensure startDateTime and endDateTime are valid dates
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        return res.status(400).json({ message: 'Invalid date format for start time or end time' });
      }

      const hours = (endDateTime - startDateTime) / (1000 * 60 * 60); // Convert milliseconds to hours

      // Ensure the number of hours is a positive value
      if (hours <= 0) {
        return res.status(400).json({ message: 'End time must be greater than start time' });
      }

      totalPrice += hours * trainer.hourlyRate;
    }

    console.log(`Total Price: ${totalPrice}`);

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
  
  exports.editBooking = async (req, res) => {
    try {
      const { id } = req.params;
      const { address, participants, dates } = req.body;
  
      const booking = await Booking.findByPk(id);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
  
      // Update address
      booking.address = address || booking.address;
  
      // Update participants: Handle clearing of participants if the array is empty or provided
      await Participant.destroy({ where: { bookingId: id } }); // Clear existing participants
      if (participants && participants.length > 0) {
        const participantData = participants.map(participant => ({
          ...participant,
          bookingId: id
        }));
        await Participant.bulkCreate(participantData);
      }
  
      // Initialize total price to 0
      let totalPrice = 0;
  
      // Fetch the trainer to get the hourly rate
      const trainer = await Trainer.findByPk(booking.trainerId);
      if (!trainer) {
        return res.status(404).json({ message: 'Trainer not found' });
      }
  
      // Update dates and calculate total price based on hours
      await BookingDate.destroy({ where: { bookingId: id } }); // Clear existing dates
      if (dates && dates.length > 0) {
        const dateData = dates.map(date => {
          const { date: datePart, startTime, endTime } = date;
  
          // Validate and combine date and time
          const startDateTime = new Date(`${datePart}T${startTime}`);
          const endDateTime = new Date(`${datePart}T${endTime}`);
  
          // Ensure startDateTime and endDateTime are valid dates
          if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            throw new Error('Invalid date format for start time or end time');
          }
  
          const hours = (endDateTime - startDateTime) / (1000 * 60 * 60); // Convert milliseconds to hours
  
          // Ensure the number of hours is a positive value
          if (hours <= 0) {
            throw new Error('End time must be greater than start time');
          }
  
          // Accumulate the total price
          totalPrice += hours * trainer.hourlyRate;
  
          return {
            ...date,
            bookingId: id
          };
        });
  
        await BookingDate.bulkCreate(dateData);
      }
  
      // Update total price: If no dates are provided, totalPrice will remain 0
      booking.totalPrice = totalPrice;
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


  // Rebook a service
exports.rebookService = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Fetch the original booking details
    const originalBooking = await Booking.findByPk(bookingId, {
      include: [Participant, BookingDate]
    });

    if (!originalBooking) {
      return res.status(404).json({ message: 'Original booking not found' });
    }

    // Prepare the data for the new booking
    const newBookingData = {
      userId: originalBooking.userId,
      serviceId: originalBooking.serviceId,
      trainerId: originalBooking.trainerId,
      address: originalBooking.address,
      totalPrice: 0 // Set to 0 for now; the price will be recalculated based on new dates
    };

    // Create the new booking without saving it to the database yet
    const newBooking = Booking.build(newBookingData);

    // Attach the original participants to the new booking (but don't save them yet)
    if (originalBooking.Participants && originalBooking.Participants.length > 0) {
      newBooking.Participants = originalBooking.Participants.map(participant => ({
        name: participant.name,
        surname: participant.surname,
        age: participant.age,
        category: participant.category,
        bookingId: null // Set to null since this is a new booking
      }));
    }

    // Return the new booking details, leaving date and time fields empty
    res.status(200).json({
      message: 'Service rebooked successfully. Please review and update the details as needed.',
      booking: newBooking,
      participants: newBooking.Participants,
      address: newBooking.address,
      // Leave dates empty for the user to fill in
      dates: []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.error(error);
  }
};
