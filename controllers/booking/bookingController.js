const Booking = require('../../models/Bookings/Booking');
const Participant = require('../../models/Bookings/Participant');
const BookingDate = require('../../models/Bookings/BookingDate');
const Trainer = require('../../models/Trainer/Trainer');
const ServiceDetails = require('../../models/Services/ServiceDetails');
const { Service } = require('../../models/Services/Service');
const SubCategory = require('../../models/Category/SubCategory');
const Category = require('../../models/Category/Category');
const sequelize = require('../../config/sequelize');
const moment = require('moment'); // Make sure you have moment.js installed
const { Op } = require('sequelize'); // Import Op from Sequelize

// Helper function to update past bookings as completed
const updatePastBookingsStatus = async () => {
  const currentDate = new Date();

  // Find all bookings that are still active and have past booking dates
  const activeBookings = await Booking.findAll({
    where: { status: 'active' }, // Only check active bookings
    include: [
      {
        model: BookingDate,
        attributes: ['date', 'endTime'],
      },
    ],
  });

  for (let booking of activeBookings) {
    const hasPastDate = booking.BookingDates.some(bookingDate => {
      const bookingDateTime = new Date(`${bookingDate.date}T${bookingDate.endTime}`);
      return bookingDateTime < currentDate;
    });

    if (hasPastDate) {
      // Update the status to 'completed'
      booking.status = 'completed';
      await booking.save();
    }
  }
};


// Helper function to convert 12-hour time format to 24-hour format
const convertTo24HourFormat = (time) => {
  const [hours, minutes, period] = time.match(/(\d+):(\d+):(\d+)? ?(AM|PM)?/).slice(1);
  let formattedHours = parseInt(hours, 10);
  
  if (period === 'PM' && formattedHours < 12) {
    formattedHours += 12;
  } else if (period === 'AM' && formattedHours === 12) {
    formattedHours = 0;
  }

  return `${formattedHours.toString().padStart(2, '0')}:${minutes}:00`;
};

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

    const createdBookings = [];

    // Process each date separately to create individual bookings
    for (let singleDate of dates) {
      let { date: datePart, startTime, endTime } = singleDate;

      if (!datePart || !startTime || !endTime) {
        return res.status(400).json({ message: 'Date, start time, and end time are required for each booking session' });
      }

      // Check if times are in 12-hour format and convert them to 24-hour format
      if (startTime.match(/(AM|PM)/)) {
        startTime = convertTo24HourFormat(startTime);
      }
      if (endTime.match(/(AM|PM)/)) {
        endTime = convertTo24HourFormat(endTime);
      }

      const startDateTime = new Date(`${datePart}T${startTime}`);
      const endDateTime = new Date(`${datePart}T${endTime}`);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        return res.status(400).json({ message: 'Invalid date format for start time or end time' });
      }

      const hours = (endDateTime - startDateTime) / (1000 * 60 * 60); // Convert milliseconds to hours
      if (hours <= 0) {
        return res.status(400).json({ message: 'End time must be greater than start time' });
      }

      const totalPrice = hours * trainer.hourlyRate;

      // Create the booking for the single date
      const booking = await Booking.create(
        {
          userId,
          serviceId,
          trainerId,
          address,
          totalPrice,
        },
        { transaction }
      );

      // Associate participants with the current booking
      if (participants.length > 0) {
        const participantData = participants.map((participant) => ({
          ...participant,
          bookingId: booking.id,
        }));
        await Participant.bulkCreate(participantData, { transaction });
      }

      // Create the booking session
      await BookingDate.create(
        {
          date: datePart,
          startTime,
          endTime,
          bookingId: booking.id,
          sessionNumber: 1, // Since this is a single session per booking
        },
        { transaction }
      );

      createdBookings.push({
        bookingId: booking.id,
        userId: booking.userId,
        serviceId: booking.serviceId,
        trainerId: booking.trainerId,
        address: booking.address,
        totalPrice: booking.totalPrice,
        participants,
        session: {
          date: datePart,
          startTime,
          endTime,
        },
      });
    }

    await transaction.commit();

    // Return all created bookings
    res.status(201).json({ bookings: createdBookings });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

// exports.createBooking = async (req, res) => {
//   const transaction = await sequelize.transaction();
//   try {
//     const { userId, serviceId, trainerId: providedTrainerId, address, participants = [], recurrence } = req.body;

//     // Validate recurrence input
//     if (!recurrence || !recurrence.type) {
//       return res.status(400).json({ message: 'Recurrence type is required (daily, weekly, monthly, or exact)' });
//     }

//     const { type, dates: exactDates, interval, endDate } = recurrence;

//     // Ensure correct structure for exact type
//     if (type === 'exact' && (!exactDates || exactDates.length === 0)) {
//       return res.status(400).json({ message: 'Exact dates are required for exact recurrence type' });
//     }

//     // Validate interval and endDate for recurring bookings
//     if (type !== 'exact' && (!interval || !endDate)) {
//       return res.status(400).json({ message: 'Interval and endDate are required for recurring bookings' });
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

//     const createdBookings = [];

//     // Generate dates based on recurrence type
//     let bookingDates = [];
//     if (type === 'exact') {
//       bookingDates = exactDates;
//     } else {
//       let currentDate = new Date();
//       while (currentDate <= new Date(endDate)) {
//         bookingDates.push({
//           date: currentDate.toISOString().split('T')[0], // Format date as YYYY-MM-DD
//           startTime: "12:00:00", // Default start time, adjust as needed
//           endTime: "14:00:00"   // Default end time, adjust as needed
//         });

//         if (type === 'daily') {
//           currentDate.setDate(currentDate.getDate() + interval);
//         } else if (type === 'weekly') {
//           currentDate.setDate(currentDate.getDate() + interval * 7);
//         } else if (type === 'monthly') {
//           currentDate.setMonth(currentDate.getMonth() + interval);
//         }
//       }
//     }

//     // Process each generated date
//     for (let singleDate of bookingDates) {
//       const { date, startTime, endTime } = singleDate;

//       if (!date || !startTime || !endTime) {
//         return res.status(400).json({ message: 'Date, start time, and end time are required for each booking session' });
//       }

//       const startDateTime = new Date(`${date}T${startTime}`);
//       const endDateTime = new Date(`${date}T${endTime}`);

//       if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
//         return res.status(400).json({ message: 'Invalid date format for start time or end time' });
//       }

//       const hours = (endDateTime - startDateTime) / (1000 * 60 * 60); // Convert milliseconds to hours
//       if (hours <= 0) {
//         return res.status(400).json({ message: 'End time must be greater than start time' });
//       }

//       const totalPrice = hours * trainer.hourlyRate;

//       // Create the booking for the single date
//       const booking = await Booking.create(
//         {
//           userId,
//           serviceId,
//           trainerId,
//           address,
//           totalPrice,
//         },
//         { transaction }
//       );

//       // Associate participants with the current booking
//       if (participants.length > 0) {
//         const participantData = participants.map((participant) => ({
//           ...participant,
//           bookingId: booking.id,
//         }));
//         await Participant.bulkCreate(participantData, { transaction });
//       }

//       // Create the booking session
//       await BookingDate.create(
//         {
//           date,
//           startTime,
//           endTime,
//           bookingId: booking.id,
//           sessionNumber: 1, // Since this is a single session per booking
//         },
//         { transaction }
//       );

//       createdBookings.push({
//         bookingId: booking.id,
//         userId: booking.userId,
//         serviceId: booking.serviceId,
//         trainerId: booking.trainerId,
//         address: booking.address,
//         totalPrice: booking.totalPrice,
//         participants,
//         session: {
//           date,
//           startTime,
//           endTime,
//         },
//       });
//     }

//     await transaction.commit();

//     // Return all created bookings
//     res.status(201).json({ bookings: createdBookings });
//   } catch (error) {
//     await transaction.rollback();
//     res.status(500).json({ error: error.message });
//   }
// };

// exports.createBooking = async (req, res) => {
//   const transaction = await sequelize.transaction();
//   try {
//     const { userId, serviceId, trainerId: providedTrainerId, address, participants = [], recurrence } = req.body;

//     // Validate recurrence input
//     if (!recurrence || !recurrence.type) {
//       return res.status(400).json({ message: 'Recurrence type is required (daily, weekly, monthly, or exact)' });
//     }

//     const { type, dates: exactDates, startDate, endDate } = recurrence;

//     // Ensure correct structure for exact type
//     if (type === 'exact' && (!exactDates || exactDates.length === 0)) {
//       return res.status(400).json({ message: 'Exact dates are required for exact recurrence type' });
//     }

//     // Validate startDate and endDate for recurring bookings
//     if (type !== 'exact' && (!startDate || !endDate)) {
//       return res.status(400).json({ message: 'Start date and end date are required for recurring bookings' });
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

//     const createdBookings = [];

//     // Generate dates based on recurrence type
//     let bookingDates = [];
//     if (type === 'exact') {
//       bookingDates = exactDates;
//     } else {
//       let currentDate = new Date(startDate);
//       while (currentDate <= new Date(endDate)) {
//         bookingDates.push({
//           date: currentDate.toISOString().split('T')[0], // Format date as YYYY-MM-DD
//           startTime: "12:00:00", // Default start time, adjust as needed
//           endTime: "14:00:00"   // Default end time, adjust as needed
//         });

//         if (type === 'daily') {
//           currentDate.setDate(currentDate.getDate() + 1);
//         } else if (type === 'weekly') {
//           currentDate.setDate(currentDate.getDate() + 7);
//         } else if (type === 'monthly') {
//           currentDate.setMonth(currentDate.getMonth() + 1);
//         }
//       }
//     }

//     // Process each generated date
//     for (let singleDate of bookingDates) {
//       const { date, startTime, endTime } = singleDate;

//       if (!date || !startTime || !endTime) {
//         return res.status(400).json({ message: 'Date, start time, and end time are required for each booking session' });
//       }

//       const startDateTime = new Date(`${date}T${startTime}`);
//       const endDateTime = new Date(`${date}T${endTime}`);

//       if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
//         return res.status(400).json({ message: 'Invalid date format for start time or end time' });
//       }

//       const hours = (endDateTime - startDateTime) / (1000 * 60 * 60); // Convert milliseconds to hours
//       if (hours <= 0) {
//         return res.status(400).json({ message: 'End time must be greater than start time' });
//       }

//       const totalPrice = hours * trainer.hourlyRate;

//       // Create the booking for the single date
//       const booking = await Booking.create(
//         {
//           userId,
//           serviceId,
//           trainerId,
//           address,
//           totalPrice,
//         },
//         { transaction }
//       );

//       // Associate participants with the current booking
//       if (participants.length > 0) {
//         const participantData = participants.map((participant) => ({
//           ...participant,
//           bookingId: booking.id,
//         }));
//         await Participant.bulkCreate(participantData, { transaction });
//       }

//       // Create the booking session
//       await BookingDate.create(
//         {
//           date,
//           startTime,
//           endTime,
//           bookingId: booking.id,
//           sessionNumber: 1, // Since this is a single session per booking
//         },
//         { transaction }
//       );

//       createdBookings.push({
//         bookingId: booking.id,
//         userId: booking.userId,
//         serviceId: booking.serviceId,
//         trainerId: booking.trainerId,
//         address: booking.address,
//         totalPrice: booking.totalPrice,
//         participants,
//         session: {
//           date,
//           startTime,
//           endTime,
//         },
//       });
//     }

//     await transaction.commit();

//     // Return all created bookings
//     res.status(201).json({ bookings: createdBookings });
//   } catch (error) {
//     await transaction.rollback();
//     res.status(500).json({ error: error.message });
//   }
// };

// exports.createBooking = async (req, res) => {
//   const transaction = await sequelize.transaction();
//   try {
//     const { userId, serviceId, trainerId: providedTrainerId, address, participants = [], recurrence } = req.body;

//     // Validate recurrence input
//     if (!recurrence || !recurrence.type) {
//       return res.status(400).json({ message: 'Recurrence type is required (daily, weekly, monthly, or exact)' });
//     }

//     const { type, dates: exactDates, startDate, endDate, timeSlots } = recurrence;

//     // Ensure correct structure for exact type
//     if (type === 'exact' && (!exactDates || exactDates.length === 0)) {
//       return res.status(400).json({ message: 'Exact dates are required for exact recurrence type' });
//     }

//     // Validate startDate, endDate, and timeSlots for recurring bookings
//     if (type !== 'exact' && (!startDate || !endDate || !timeSlots || timeSlots.length === 0)) {
//       return res.status(400).json({ message: 'Start date, end date, and time slots are required for recurring bookings' });
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

//     const createdBookings = [];

//     // Generate dates based on recurrence type
//     let bookingDates = [];
//     if (type === 'exact') {
//       bookingDates = exactDates;
//     } else {
//       let currentDate = new Date(startDate);
//       while (currentDate <= new Date(endDate)) {
//         for (let timeSlot of timeSlots) {
//           const { startTime, endTime } = timeSlot;
//           bookingDates.push({
//             date: currentDate.toISOString().split('T')[0], // Format date as YYYY-MM-DD
//             startTime,
//             endTime
//           });
//         }

//         if (type === 'daily') {
//           currentDate.setDate(currentDate.getDate() + 1);
//         } else if (type === 'weekly') {
//           currentDate.setDate(currentDate.getDate() + 7);
//         } else if (type === 'monthly') {
//           currentDate.setMonth(currentDate.getMonth() + 1);
//         }
//       }
//     }

//     // Process each generated date
//     for (let singleDate of bookingDates) {
//       const { date, startTime, endTime } = singleDate;

//       if (!date || !startTime || !endTime) {
//         return res.status(400).json({ message: 'Date, start time, and end time are required for each booking session' });
//       }

//       const startDateTime = new Date(`${date}T${startTime}`);
//       const endDateTime = new Date(`${date}T${endTime}`);

//       if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
//         return res.status(400).json({ message: 'Invalid date format for start time or end time' });
//       }

//       const hours = (endDateTime - startDateTime) / (1000 * 60 * 60); // Convert milliseconds to hours
//       if (hours <= 0) {
//         return res.status(400).json({ message: 'End time must be greater than start time' });
//       }

//       const totalPrice = hours * trainer.hourlyRate;

//       // Create the booking for the single date
//       const booking = await Booking.create(
//         {
//           userId,
//           serviceId,
//           trainerId,
//           address,
//           totalPrice,
//         },
//         { transaction }
//       );

//       // Associate participants with the current booking
//       if (participants.length > 0) {
//         const participantData = participants.map((participant) => ({
//           ...participant,
//           bookingId: booking.id,
//         }));
//         await Participant.bulkCreate(participantData, { transaction });
//       }

//       // Create the booking session
//       await BookingDate.create(
//         {
//           date,
//           startTime,
//           endTime,
//           bookingId: booking.id,
//           sessionNumber: 1, // Since this is a single session per booking
//         },
//         { transaction }
//       );

//       createdBookings.push({
//         bookingId: booking.id,
//         userId: booking.userId,
//         serviceId: booking.serviceId,
//         trainerId: booking.trainerId,
//         address: booking.address,
//         totalPrice: booking.totalPrice,
//         participants,
//         session: {
//           date,
//           startTime,
//           endTime,
//         },
//       });
//     }

//     await transaction.commit();

//     // Return all created bookings
//     res.status(201).json({ bookings: createdBookings });
//   } catch (error) {
//     await transaction.rollback();
//     res.status(500).json({ error: error.message });
//   }
// };


// Get user bookings with pagination
exports.getUserBookingsWithPagination = async (req, res) => {
  try {
    // Update past bookings before fetching
    await updatePastBookingsStatus();

    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query; // Default pagination values

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Fetch bookings with pagination
    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: { userId },
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        { model: Participant },
        {
          model: BookingDate,
          attributes: ['date', 'startTime', 'endTime', 'createdAt'],
        },
        {
          model: Service,
          attributes: ['id', 'name', 'description', 'image', 'duration', 'hourlyRate', 'level'],
          include: [
            {
              model: ServiceDetails,
              attributes: ['fullDescription', 'highlights', 'whatsIncluded', 'whatsNotIncluded', 'recommendations', 'coachInfo'],
            },
            {
              model: Trainer,
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

    // Process bookings to include only the latest createdAt dates
    const filteredBookings = bookings.map(booking => {
      const latestCreatedAt = booking.BookingDates.reduce((latest, date) => {
        return new Date(date.createdAt) > new Date(latest.createdAt) ? date : latest;
      }, booking.BookingDates[0]).createdAt;

      const validDates = booking.BookingDates.filter(date => date.createdAt === latestCreatedAt);

      return {
        ...booking.toJSON(),
        BookingDates: validDates,
      };
    });

    // Return paginated response
    res.status(200).json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      bookings: filteredBookings,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getPaginatedFilteredBookingsOfUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      categoryOrSubcategory,
      startDate,
      endDate,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { userId };

    // Apply status filter
    if (status) {
      whereClause.status = status;
    }

    // Sequelize-specific filtering for nested models
    const includeFilters = [];

    // Add filter for category or subcategory
    if (categoryOrSubcategory) {
      includeFilters.push({
        model: Service,
        as: 'Service', // Ensure alias matches your model association
        required: true,
        include: [
          {
            model: SubCategory,
            as: 'SubCategory', // Ensure alias matches your model association
            required: true,
            where: { name: categoryOrSubcategory },
            attributes: ['id', 'name'],
          },
        ],
      });
    } else {
      includeFilters.push({
        model: Service,
        as: 'Service', // Ensure alias matches your model association
        required: true,
        include: [
          {
            model: SubCategory,
            as: 'SubCategory',
            attributes: ['id', 'name'],
          },
        ],
      });
    }

    // Add date filter
    if (startDate && endDate) {
      includeFilters.push({
        model: BookingDate,
        as: 'BookingDates', // Ensure alias matches your model association
        required: true,
        where: {
          date: {
            [Op.between]: [startDate, endDate],
          },
        },
        attributes: ['date', 'startTime', 'endTime', 'createdAt'],
      });
    } else {
      includeFilters.push({
        model: BookingDate,
        as: 'BookingDates',
        required: true,
        attributes: ['date', 'startTime', 'endTime', 'createdAt'],
      });
    }

    // Fetch paginated and filtered bookings
    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset,
      distinct: true,
      include: [
        { model: Participant, as: 'Participants' },
        ...includeFilters,
      ],
    });

    // Return paginated response
    res.status(200).json({
      bookings,
      totalBookings: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error('Error in pagination:', error.message);
    res.status(500).json({ error: 'Failed to fetch bookings with pagination.' });
  }
};



// Get all bookings of a user
exports.getAllBookingsOfUser = async (req, res) => {
  try {
    // Update past bookings before fetching
    await updatePastBookingsStatus();

    const { userId } = req.params;
    const bookings = await Booking.findAll({
      where: { userId },
      include: [
        { model: Participant },
        {
          model: BookingDate,
          attributes: ['date', 'startTime', 'endTime', 'createdAt'],
        },
        {
          model: Service,
          attributes: ['id', 'name', 'description', 'image', 'duration', 'hourlyRate', 'level'],
          include: [
            {
              model: ServiceDetails,
              attributes: ['fullDescription', 'highlights', 'whatsIncluded', 'whatsNotIncluded', 'recommendations', 'coachInfo'],
            },
            {
              model: Trainer,
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

    const filteredBookings = bookings.map(booking => {
      const latestCreatedAt = booking.BookingDates.reduce((latest, date) => {
        return new Date(date.createdAt) > new Date(latest.createdAt) ? date : latest;
      }, booking.BookingDates[0]).createdAt;

      const validDates = booking.BookingDates.filter(date => date.createdAt === latestCreatedAt);

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
    const { id } = req.params; // Booking ID from the URL
    const { userId } = req.query; // User ID from the query parameters

    // Find the booking by id and userId
    const booking = await Booking.findOne({
      where: {
        id, // Booking ID
        userId, // Filter by user ID
      },
      include: [
        {
          model: Participant,
          where: { bookingId: id },
          required: false, // Allow bookings without participants
        },
        { 
          model: BookingDate,
          attributes: ['date', 'startTime', 'endTime'], // Include date, startTime, endTime
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
                'coachInfo',
              ],
            },
            {
              model: Trainer,
              through: { attributes: [] }, // Include Trainer through the ServiceTrainer join table
              attributes: ['id', 'name', 'surname', 'avatar', 'hourlyRate', 'userRating'], // Only fetch necessary fields
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

    // Extract the associated trainer for this booking through the service
    const selectedTrainer = booking.Service?.Trainers?.[0] || null; // Select the first trainer

    // Send the response with all required fields, including the date, startTime, endTime, and trainer
    res.status(200).json({
      ...booking.toJSON(),
      BookingDates: validDates, // Return the most recent valid date
      Participants: validParticipants, // Return participants only if they exist
      Trainer: selectedTrainer, // Return the trainer associated with the service
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBookingsByIds = async (req, res) => {
  try {
    const { ids } = req.query; // Booking IDs passed as a comma-separated string
    const { userId } = req.query; // User ID from query parameters

    if (!ids) {
      return res.status(400).json({ message: 'Booking IDs are required' });
    }
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Split the string into an array of numbers
    const bookingIds = ids.split(',').map(Number);

    // Find all bookings matching the provided IDs and userId
    const bookings = await Booking.findAll({
      where: {
        id: bookingIds, // Match booking IDs
        userId, // Filter by user ID
      },
      include: [
        {
          model: Participant,
          required: false, // Include participants if available
        },
        {
          model: BookingDate,
          attributes: ['date', 'startTime', 'endTime'], // Include date, startTime, endTime
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
                'coachInfo',
              ],
            },
            {
              model: Trainer,
              through: { attributes: [] }, // Include Trainer through the ServiceTrainer join table
              attributes: ['id', 'name', 'surname', 'avatar', 'hourlyRate', 'userRating'], // Only fetch necessary fields
            },
          ],
        },
      ],
    });

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found' });
    }

    // Map over bookings to prepare the response
    const response = bookings.map((booking) => {
      const validParticipants = booking.Participants && booking.Participants.length > 0
        ? booking.Participants
        : null;

      const validDates = booking.BookingDates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 1);

      const selectedTrainer = booking.Service?.Trainers?.[0] || null;

      return {
        ...booking.toJSON(),
        BookingDates: validDates, // Return the most recent valid date
        Participants: validParticipants, // Return participants only if they exist
        Trainer: selectedTrainer, // Return the trainer associated with the service
      };
    });

    // Send the response
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



exports.editBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { address, participants, dates } = req.body;

    // Find the booking by ID
    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Update the address if provided
    booking.address = address || booking.address;

    // Normalize and update participants
    const normalizedParticipants = participants.map(participant => ({
      ...participant,
      category: normalizeCategory(participant.category)
    }));

    // Clear existing participants and update with new ones
    await Participant.destroy({ where: { bookingId: id } }); // Clear existing participants
    if (normalizedParticipants.length > 0) {
      const participantData = normalizedParticipants.map(participant => ({
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

    // Clear existing dates and update with new dates, calculate total price
    await BookingDate.destroy({ where: { bookingId: id } }); // Clear existing dates

    if (dates && dates.length > 0) {
      const dateData = dates.map(date => {
        // Validate and ensure that date, startTime, and endTime are present
        if (!date || !date.date || !date.startTime || !date.endTime) {
          throw new Error('Invalid date, start time, or end time');
        }

        const { date: datePart, startTime, endTime } = date;

        // Combine date and time
        const startDateTime = new Date(`${datePart}T${startTime}`);
        const endDateTime = new Date(`${datePart}T${endTime}`);

        // Ensure the date format is valid
        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
          throw new Error('Invalid date format for start time or end time');
        }

        // Calculate the duration in hours
        const hours = (endDateTime - startDateTime) / (1000 * 60 * 60); // Convert milliseconds to hours

        // Ensure the number of hours is a positive value
        if (hours <= 0) {
          throw new Error('End time must be greater than start time');
        }

        // Accumulate the total price
        totalPrice += hours * trainer.hourlyRate;

        return {
          date: datePart,
          startTime,
          endTime,
          bookingId: id
        };
      });

      // If valid date data exists, bulk create BookingDates
      if (dateData.length > 0) {
        await BookingDate.bulkCreate(dateData);
      }
    }

    // Update the total price and save the booking
    booking.totalPrice = totalPrice;
    await booking.save();

    // Respond with the updated booking
    res.status(200).json(booking);
  } catch (error) {
    // Catch any errors and respond with 500
    res.status(500).json({ error: error.message });
  }
};

exports.extendSession = async (req, res) => {
  try {
    const { id } = req.params; // Booking ID
    const { newEndTime, sessionDate } = req.body; // New end time and session date

    // Find the booking by ID
    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Find the BookingDate by matching the bookingId and the sessionDate
    const bookingDate = await BookingDate.findOne({
      where: {
        bookingId: id,
        date: sessionDate, // Matching based on the session date
      },
    });

    if (!bookingDate) {
      return res.status(404).json({ message: 'Booking date not found for the provided session date' });
    }

    // Fetch the trainer to get the hourly rate
    const trainer = await Trainer.findByPk(booking.trainerId);
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }

    // Validate new end time
    const startDateTime = new Date(`${bookingDate.date}T${bookingDate.startTime}`);
    const newEndDateTime = new Date(`${bookingDate.date}T${newEndTime}`);

    if (isNaN(newEndDateTime.getTime())) {
      throw new Error('Invalid end time format');
    }

    // Ensure the new end time is later than the current start time
    const newDuration = (newEndDateTime - startDateTime) / (1000 * 60 * 60); // Convert milliseconds to hours

    if (newDuration <= 0) {
      throw new Error('End time must be greater than start time');
    }

    // Calculate the price difference for the extended time
    const currentDuration = (new Date(`${bookingDate.date}T${bookingDate.endTime}`) - startDateTime) / (1000 * 60 * 60);
    const extraHours = newDuration - currentDuration;

    if (extraHours <= 0) {
      throw new Error('The new end time must extend the current session');
    }

    // Update the booking's total price
    const extraPrice = extraHours * trainer.hourlyRate;
    booking.totalPrice += extraPrice;

    // Save the updated booking and booking date
    bookingDate.endTime = newEndTime;
    await bookingDate.save();
    await booking.save();

    // Respond with the updated booking and booking date
    res.status(200).json({
      message: 'Session extended successfully',
      booking,
      bookingDate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




// Helper function to normalize category
function normalizeCategory(category) {
  switch (category) {
    case 'Adults':
      return 'Adult';
    case 'Teenagers':
      return 'Teenager';
    case 'Children':
      return 'Child';
    default:
      return category; // Return as is if it's already correct
  }
}

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


exports.getFilteredBookingsOfUser = async (req, res) => {
  try {
    // Update past bookings before fetching
    await updatePastBookingsStatus();

    const { userId } = req.params;
    const { categoryOrSubcategory, startDate, endDate } = req.query;

    // Fetch bookings of the user
    const bookings = await Booking.findAll({
      where: { userId },
      include: [
        { model: Participant },
        {
          model: BookingDate,
          attributes: ['date', 'startTime', 'endTime', 'createdAt'],
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
                'coachInfo',
              ],
            },
            {
              model: Trainer,
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

    const filteredBookings = bookings.filter((booking) => {
      let matches = true;

      // Check category or subcategory filter
      if (categoryOrSubcategory) {
        const matchesCategoryOrSubcategory =
          booking.Service.SubCategory.name === categoryOrSubcategory ||
          booking.Service.SubCategory.Category.name === categoryOrSubcategory;
        matches = matches && matchesCategoryOrSubcategory;
      }

      // Check date filter
      if (startDate && endDate) {
        const start = moment(startDate, 'YYYY-MM-DD').startOf('day');
        const end = moment(endDate, 'YYYY-MM-DD').endOf('day');

        const matchesDate = booking.BookingDates.some((bookingDate) => {
          const bookingMoment = moment(bookingDate.date, 'YYYY-MM-DD').startOf('day');
          return bookingMoment.isBetween(start, end, 'day', '[]');
        });

        matches = matches && matchesDate;
      }

      return matches;
    });

    res.status(200).json(filteredBookings);
  } catch (error) {
    console.error('Error fetching filtered bookings:', error);
    res.status(500).json({ error: error.message });
  }
};


// Method to get user bookings based on selected dates
exports.getUserBookingsByDates = async (req, res) => {
  try {
    const { userId } = req.params;
    const { dates } = req.body; // Expecting an array of date strings in 'YYYY-MM-DD' format

    // Validate that dates are provided
    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: 'No dates provided' });
    }

    // Fetch bookings that match the userId and have BookingDates matching the selected dates
    const bookings = await Booking.findAll({
      where: { userId },
      include: [
        {
          model: BookingDate,
          where: {
            date: {
              [Op.in]: dates,
            },
          },
          attributes: ['date', 'startTime', 'endTime', 'createdAt'],
        },
        {
          model: Participant,
        },
        {
          model: Service,
          attributes: [
            'id',
            'name',
            'description',
            'image',
            'duration',
            'hourlyRate',
            'level',
          ],
          include: [
            {
              model: ServiceDetails,
              attributes: [
                'fullDescription',
                'highlights',
                'whatsIncluded',
                'whatsNotIncluded',
                'recommendations',
                'coachInfo',
              ],
            },
            {
              model: Trainer,
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

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getBookingCountsForServices = async (req, res) => {
  try {
    const { serviceIds } = req.body;

    // Fetch booking counts for each service ID
    const counts = await Booking.findAll({
      where: { serviceId: serviceIds },
      attributes: ['serviceId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['serviceId']
    });

    // Transform data to make it easy to work with on the frontend
    const result = counts.map(count => ({
      serviceId: count.serviceId,
      count: count.get('count')
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching booking counts:', error);
    res.status(500).json({ message: 'Failed to fetch booking counts', error });
  }
};


// Remove a booking
exports.removeBooking = async (req, res) => {
  try {
    const { id } = req.params; // Extract the booking ID from the request parameters

    // Find the booking by its ID
    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' }); // Return 404 if booking not found
    }

    // Delete the booking
    await booking.destroy();

    res.status(200).json({ message: 'Booking removed successfully' }); // Return success message
  } catch (error) {
    res.status(500).json({ error: error.message }); // Handle any errors
  }
};

exports.rateBooking = async (req, res) => {
  try {
    const { id } = req.params; // Booking ID from URL
    const { rating, review } = req.body; // Rating and review data from the request body

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Invalid rating. Must be between 1 and 5.' });
    }

    // Find the booking by ID
    const booking = await Booking.findByPk(id, { include: Service });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Update the rating and review fields
    booking.rating = rating;
    booking.review = review || null; // Optional review
    await booking.save();

    // Update the service's ratings
    const service = booking.Service;
    if (service) {
      const ratings = await Booking.findAll({
        where: { serviceId: service.id },
        attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'], [sequelize.fn('COUNT', sequelize.col('rating')), 'totalRatings']],
        raw: true,
      });

      const avgRating = parseFloat(ratings[0].avgRating).toFixed(1); // Rounded to 1 decimal
      const totalRatings = ratings[0].totalRatings;

      service.averageRating = avgRating;
      service.totalRatings = totalRatings;
      await service.save();
    }

    res.status(200).json({
      message: 'Rating and review updated successfully',
      booking,
      service: {
        id: service.id,
        averageRating: service.averageRating,
        totalRatings: service.totalRatings,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
