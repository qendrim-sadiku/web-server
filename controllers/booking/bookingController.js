// const { Booking, Participant, BookingDate } = require('../../models/Booking');
const Booking = require('../../models/Bookings/Booking');
const Participant = require('../../models/Bookings/Participant');
const BookingDate = require('../../models/Bookings/BookingDate');
const  Trainer  = require('../../models/Trainer/Trainer');
const ServiceDetails = require('../../models/Services/ServiceDetails');
const { Service } = require('../../models/Services/Service');
const SubCategory = require('../../models/Category/SubCategory');
const Category = require('../../models/Category/Category');
const sequelize = require('../../config/sequelize');


// exports.createBooking = async (req, res) => {
//   const transaction = await sequelize.transaction();
//   try {
//     const { userId, serviceId, trainerId, address, participants = [], dates } = req.body; // Default participants to empty array if not provided

//     // Ensure dates array is not empty
//     if (!dates || dates.length === 0) {
//       return res.status(400).json({ message: 'Booking dates are required' });
//     }

//     // Fetch the trainer to get the hourly rate
//     const trainer = await Trainer.findByPk(trainerId);
//     if (!trainer) {
//       return res.status(404).json({ message: 'Trainer not found' });
//     }

//     let totalPrice = 0;
//     const validDates = [];

//     // Validate and calculate total price based on the number of hours booked and the trainer's hourly rate
//     for (let date of dates) {
//       const { date: datePart, startTime, endTime } = date;

//       if (!datePart || !startTime || !endTime) {
//         return res.status(400).json({ message: 'Date, start time, and end time are required for each booking date' });
//       }

//       const startDateTime = new Date(`${datePart}T${startTime}`);
//       const endDateTime = new Date(`${datePart}T${endTime}`);

//       if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
//         return res.status(400).json({ message: 'Invalid date format for start time or end time' });
//       }

//       const hours = (endDateTime - startDateTime) / (1000 * 60 * 60);
//       if (hours <= 0) {
//         return res.status(400).json({ message: 'End time must be greater than start time' });
//       }

//       totalPrice += hours * trainer.hourlyRate;
//       validDates.push({ date: datePart, startTime, endTime, bookingId: null });
//     }

//     // Create the booking
//     const booking = await Booking.create({
//       userId,
//       serviceId,
//       trainerId,
//       address,
//       totalPrice
//     }, { transaction });

//     // Ensure participants are unique to the current booking
//     if (participants.length > 0) {
//       const participantData = participants.map(participant => ({
//         ...participant,
//         bookingId: booking.id // Associate participants with the current booking
//       }));
//       await Participant.bulkCreate(participantData, { transaction });
//     }

//     // Add valid dates
//     if (validDates.length > 0) {
//       const dateData = validDates.map(date => ({
//         ...date,
//         bookingId: booking.id // Associate dates with the current booking
//       }));
//       await BookingDate.bulkCreate(dateData, { transaction });
//     }

//     await transaction.commit();
//     res.status(201).json(booking);
//   } catch (error) {
//     await transaction.rollback();
//     res.status(500).json({ error: error.message });
//   }
// };

// exports.createBooking = async (req, res) => {
//   const transaction = await sequelize.transaction();
//   try {
//     const { userId, serviceId, trainerId: providedTrainerId, address, participants = [], dates } = req.body; // Default participants to empty array if not provided

//     // Ensure dates array is not empty
//     if (!dates || dates.length === 0) {
//       return res.status(400).json({ message: 'Booking dates are required' });
//     }

//     // Fetch the service to get the default trainer if trainerId is not provided
//     let trainerId = providedTrainerId;
//     if (!trainerId) {
//       const service = await Service.findByPk(serviceId);
//       if (!service || !service.defaultTrainerId) {
//         return res.status(400).json({ message: 'No trainer specified and no default trainer found for the service' });
//       }
//       trainerId = service.defaultTrainerId;
//     }

//     // Fetch the trainer to get the hourly rate
//     const trainer = await Trainer.findByPk(trainerId);
//     if (!trainer) {
//       return res.status(404).json({ message: 'Trainer not found' });
//     }

//     let totalPrice = 0;
//     const validDates = [];

//     // Validate and calculate total price based on the number of hours booked and the trainer's hourly rate
//     for (let date of dates) {
//       const { date: datePart, startTime, endTime } = date;

//       if (!datePart || !startTime || !endTime) {
//         return res.status(400).json({ message: 'Date, start time, and end time are required for each booking date' });
//       }

//       const startDateTime = new Date(`${datePart}T${startTime}`);
//       const endDateTime = new Date(`${datePart}T${endTime}`);

//       if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
//         return res.status(400).json({ message: 'Invalid date format for start time or end time' });
//       }

//       const hours = (endDateTime - startDateTime) / (1000 * 60 * 60);
//       if (hours <= 0) {
//         return res.status(400).json({ message: 'End time must be greater than start time' });
//       }

//       totalPrice += hours * trainer.hourlyRate;
//       validDates.push({ date: datePart, startTime, endTime, bookingId: null });
//     }

//     // Create the booking
//     const booking = await Booking.create({
//       userId,
//       serviceId,
//       trainerId,
//       address,
//       totalPrice
//     }, { transaction });

//     // Ensure participants are unique to the current booking
//     if (participants.length > 0) {
//       const participantData = participants.map(participant => ({
//         ...participant,
//         bookingId: booking.id // Associate participants with the current booking
//       }));
//       await Participant.bulkCreate(participantData, { transaction });
//     }

//     // Add valid dates
//     if (validDates.length > 0) {
//       const dateData = validDates.map(date => ({
//         ...date,
//         bookingId: booking.id // Associate dates with the current booking
//       }));
//       await BookingDate.bulkCreate(dateData, { transaction });
//     }

//     await transaction.commit();
//     res.status(201).json(booking);
//   } catch (error) {
//     await transaction.rollback();
//     res.status(500).json({ error: error.message });
//   }
// };

exports.createBooking = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { userId, serviceId, trainerId: providedTrainerId, address, participants = [], dates } = req.body;

    // Ensure dates array is not empty
    if (!dates || dates.length === 0) {
      return res.status(400).json({ message: 'Booking dates are required' });
    }

    // Fetch the service to get the default trainer if trainerId is not provided
    let trainerId = providedTrainerId;
    if (!trainerId) {
      const service = await Service.findByPk(serviceId);
      if (!service || !service.defaultTrainerId) {
        return res.status(400).json({ message: 'No trainer specified and no default trainer found for the service' });
      }
      trainerId = service.defaultTrainerId;
    }

    // Fetch the trainer to get the hourly rate
    const trainer = await Trainer.findByPk(trainerId);
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }

    let totalPrice = 0;
    const validDates = [];

    // Validate and calculate total price based on the number of hours booked and the trainer's hourly rate
    for (let date of dates) {
      const { date: datePart, startTime, endTime } = date;

      if (!datePart || !startTime || !endTime) {
        return res.status(400).json({ message: 'Date, start time, and end time are required for each booking date' });
      }

      const startDateTime = new Date(`${datePart}T${startTime}`);
      const endDateTime = new Date(`${datePart}T${endTime}`);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        return res.status(400).json({ message: 'Invalid date format for start time or end time' });
      }

      const hours = (endDateTime - startDateTime) / (1000 * 60 * 60);
      if (hours <= 0) {
        return res.status(400).json({ message: 'End time must be greater than start time' });
      }

      totalPrice += hours * trainer.hourlyRate;
      validDates.push({ date: datePart, startTime, endTime, bookingId: null });
    }

    // Create the booking
    const booking = await Booking.create({
      userId,
      serviceId,
      trainerId,
      address,
      totalPrice
    }, { transaction });

    // Ensure participants are unique to the current booking
    if (participants.length > 0) {
      const participantData = participants.map(participant => ({
        ...participant,
        bookingId: booking.id // Associate participants with the current booking
      }));
      await Participant.bulkCreate(participantData, { transaction });
    }

    // Add valid dates
    if (validDates.length > 0) {
      const dateData = validDates.map(date => ({
        ...date,
        bookingId: booking.id // Associate dates with the current booking
      }));
      await BookingDate.bulkCreate(dateData, { transaction });
    }

    await transaction.commit();

    // Return booking details along with the bookingId
    res.status(201).json({
      bookingId: booking.id,
      userId: booking.userId,
      serviceId: booking.serviceId,
      trainerId: booking.trainerId,
      address: booking.address,
      totalPrice: booking.totalPrice,
      participants,
      dates: validDates
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};


  
exports.getAllBookingsOfUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const bookings = await Booking.findAll({
      where: { userId },
      include: [
        { model: Participant },
        {
          model: BookingDate,
          attributes: ['date', 'startTime', 'endTime', 'createdAt'], // Ensure createdAt is included for filtering
        },
        {
          model: Service,
          attributes: ['id', 'name', 'description', 'image', 'duration', 'hourlyRate', 'level'],
          include: [
            {
              model: ServiceDetails, // Include service details
              attributes: ['fullDescription', 'highlights', 'whatsIncluded', 'whatsNotIncluded', 'recommendations', 'coachInfo'],
            },
            {
              model: Trainer, // Include trainers if needed
            },
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
          ],
        },
      ],
    });

    // Filter bookings to remove older BookingDate entries
    const filteredBookings = bookings.map(booking => {
      // Find the most recent createdAt date in the BookingDates array
      const latestCreatedAt = booking.BookingDates.reduce((latest, date) => {
        return new Date(date.createdAt) > new Date(latest.createdAt) ? date : latest;
      }, booking.BookingDates[0]).createdAt;

      // Filter the BookingDates to keep only the ones that match the latest createdAt
      const validDates = booking.BookingDates.filter(date => date.createdAt === latestCreatedAt);

      // Return the booking with only the valid dates
      return {
        ...booking.toJSON(),
        BookingDates: validDates,
      };
    });

    res.status(200).json(filteredBookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params; // Booking ID from URL

    // Find the booking by id
    const booking = await Booking.findOne({
      where: { id }, // Fetch the booking by its ID
      include: [
        {
          model: Participant,
          where: { bookingId: id },
          required: false // Allow bookings without participants
        },
        { 
          model: BookingDate 
        },
        {
          model: Service,
          attributes: ['id', 'name', 'description', 'image', 'duration', 'hourlyRate', 'level'],
          include: [
            {
              model: ServiceDetails,
              attributes: [
                'fullDescription', 
                'highlights', 
                'whatsIncluded', 
                'whatsNotIncluded', 
                'recommendations', 
                'whatsToBring', 
                'coachInfo'
              ],
            },
            {
              model: Trainer,
            },
          ],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Filter participants to only show them if they exist for the booking
    const validParticipants = booking.Participants && booking.Participants.length > 0
      ? booking.Participants
      : null;

    // Sort and keep the most recent date
    const validDates = booking.BookingDates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 1);

    res.status(200).json({
      ...booking.toJSON(),
      BookingDates: validDates, // Return the most recent valid date
      Participants: validParticipants // Return participants only if they exist
    });
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




// Get user bookings with categorized data
exports.getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming the user ID is obtained from authenticated user
    const currentDate = new Date(); // Get the current date

    // Fetch bookings with related services, trainers, subcategories, categories, and booking dates
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
        {
          model: BookingDate,
          attributes: ['date', 'startTime', 'endTime', 'createdAt'], // Include createdAt for filtering purposes
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
      if (booking.BookingDates.length > 0) {
        // Find the most recent createdAt date in the BookingDates array
        const latestCreatedAt = booking.BookingDates.reduce((latest, current) => {
          return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
        }).createdAt;

        // Filter the BookingDates to keep only the ones that match the latest createdAt
        const validDates = booking.BookingDates.filter(date => date.createdAt === latestCreatedAt);

        // Iterate over valid dates and categorize based on status and date
        validDates.forEach(bookingDate => {
          const bookingDateTime = new Date(`${bookingDate.date}T${bookingDate.startTime}`);

          if (booking.status === 'canceled') {
            // Categorize canceled bookings
            categorizedBookings.canceled.push(booking);
          } else if (bookingDateTime > currentDate) {
            // Categorize upcoming bookings
            categorizedBookings.upcoming.push(booking);
          } else {
            // Categorize past bookings
            categorizedBookings.past.push(booking);
          }
        });
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
