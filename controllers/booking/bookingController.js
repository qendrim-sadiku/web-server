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
const GroupSession = require('../../models/GroupSessions/GroupSession');
const User = require('../../models/User');

const updatePastBookingsStatus = async () => {
  
  try {
    const currentDate = new Date();

    // Find all bookings that are not already marked as "completed"
    const bookings = await Booking.findAll({
      where: { status: { [Op.ne]: 'completed' } }, // Exclude already completed bookings
      include: [
        {
          model: BookingDate,
          attributes: ['date', 'endTime', 'createdAt'],
        },
      ],
    });

    for (let booking of bookings) {
      let hasFutureDate = false;
      let hasPastDate = false;

      // Check all associated BookingDates
      booking.BookingDates.forEach((bookingDate) => {
        const bookingDateTime = new Date(`${bookingDate.date}T${bookingDate.endTime}`);

        if (bookingDateTime > currentDate) {
          hasFutureDate = true;
        } else if (bookingDateTime < currentDate) {
          hasPastDate = true;
        }
      });

      // Update booking status based on date checks
      if (hasFutureDate) {
        if (booking.status !== 'active') {
          console.log(`Updating booking ID ${booking.id} status to 'active' due to future dates.`);
          booking.status = 'active';
          await booking.save();
        }
      } else if (hasPastDate) {
        if (booking.status !== 'completed') {
          console.log(`Marking booking ID ${booking.id} as 'completed' due to only past dates.`);
          booking.status = 'completed';
          await booking.save();
        }
      }
    }
  } catch (error) {
    console.error('Error updating bookings status:', error.message);
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
    const {
      userId,
      serviceId,
      trainerId: providedTrainerId,
      address,
      participants = [],
      dates = [],
    } = req.body;

    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ message: 'At least one booking date is required' });
    }

    let trainerId = providedTrainerId;
    if (!trainerId) {
      const service = await Service.findByPk(serviceId);
      if (!service || !service.defaultTrainerId) {
        throw new Error('No trainer specified and no default trainer found for this service');
      }
      trainerId = service.defaultTrainerId;
    }

    const trainer = await Trainer.findByPk(trainerId);
    if (!trainer) {
      throw new Error('Trainer not found');
    }

    // 🔥 Fetch the user to check for `parentUserId`
    const user = await User.findByPk(userId, { attributes: ['id', 'parentUserId'] });

    if (!user) {
      throw new Error('User not found');
    }

    console.log("User Data:", user); // ✅ Debugging log to verify user data
    console.log("User Parent ID:", user.parentUserId); // ✅ Check if parentUserId is null or has a value

    let totalPrice = 0;
    let createdBookingDates = [];

    // ✅ Ensure approved is false if the user has a parentUserId
    const isApproved = user.parentUserId ? false : true;
    console.log("Final Booking Approval Status:", isApproved); // ✅ Debugging log to confirm correct value

    // Create a new Booking
    const booking = await Booking.create(
      {
        userId,
        serviceId,
        trainerId,
        address,
        totalPrice: 0, // Will be updated later
        status: 'active',
        isBookingConfirmed: false,
        approved: isApproved, // ✅ Ensure correct approval status
      },
      { transaction }
    );

    // Ensure all booking dates are inserted
    for (const dateObj of dates) {
      const { date, startTime, endTime } = dateObj;

      if (!date || !startTime || !endTime) {
        throw new Error('Each date must include: { date, startTime, endTime }');
      }

      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error('Invalid date or time format');
      }

      const hours = (endDateTime - startDateTime) / (1000 * 60 * 60);
      if (hours <= 0) {
        throw new Error('endTime must be after startTime');
      }

      totalPrice += hours * trainer.hourlyRate;

      // Insert into BookingDate table
      const bookingDate = await BookingDate.create(
        {
          bookingId: booking.id,
          date,
          startTime,
          endTime,
        },
        { transaction }
      );
      createdBookingDates.push(bookingDate);
    }

    // Update total price in the booking
    await booking.update({ totalPrice }, { transaction });

    await transaction.commit();

    return res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        id: booking.id,
        userId: booking.userId,
        serviceId: booking.serviceId,
        trainerId: booking.trainerId,
        address: booking.address,
        totalPrice: booking.totalPrice,
        approved: booking.approved, // ✅ Ensure frontend gets correct approval status
        dates: createdBookingDates,
      },
    });
  } catch (error) {
    console.error('Error creating booking:', error);

    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }

    return res.status(500).json({ error: error.message });
  }
};

exports.approveAllSubUserBookings = async (req, res) => {
  try {
    const { subUserId, parentUserId } = req.body;
    if (!subUserId || !parentUserId) {
      return res.status(400).json({ message: 'Sub User ID and Parent User ID are required' });
    }

    // Ensure the sub-user exists and belongs to the parent
    const subUser = await User.findByPk(subUserId);
    if (!subUser) {
      return res.status(404).json({ message: 'Sub-user not found' });
    }
    if (subUser.parentUserId !== parentUserId) {
      return res.status(403).json({ message: 'You are not authorized to approve these bookings' });
    }

    // Fetch all bookings made by this sub-user
    const bookings = await Booking.findAll({ where: { userId: subUserId } });
    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: 'No bookings found for this sub user' });
    }

    // Approve each booking that is not already approved
    for (const booking of bookings) {
      if (booking.status !== 'approved') {
        booking.status = 'approved';
        await booking.save();
      }
    }

    return res.status(200).json({ message: 'All bookings approved successfully' });
  } catch (error) {
    console.error('Error approving all bookings:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteSubUserBooking = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { bookingId, userId, parentUserId } = req.query;

    if (!bookingId || !userId || !parentUserId) {
      return res.status(400).json({
        message: 'Booking ID, User ID, and Parent User ID are required',
      });
    }

    console.log(
      `Attempting to delete booking with ID: ${bookingId} for user ID: ${userId}, requested by parent ID: ${parentUserId}`
    );

    // 1. Fetch the user to verify the parentUserId
    const bookingUser = await User.findByPk(userId, {
      attributes: ['id', 'parentUserId'],
      transaction,
    });

    if (!bookingUser) {
      console.log(`User with ID ${userId} not found.`);
      await transaction.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    // 2. Check if the parentUserId is authorized
    if (String(bookingUser.id) !== String(parentUserId) &&
        String(bookingUser.parentUserId) !== String(parentUserId)) {
      console.log(
        `Parent user ID ${parentUserId} is not authorized to delete bookings for user ${userId}.`
      );
      await transaction.rollback();
      return res.status(403).json({ message: 'Not authorized to delete this booking' });
    }

    // 3. Fetch the booking
    const booking = await Booking.findOne({
      where: { id: bookingId, userId: userId },
      transaction,
    });

    if (!booking) {
      console.log(`Booking with ID ${bookingId} not found for user ${userId}.`);
      await transaction.rollback();
      return res.status(404).json({ message: 'Booking not found' });
    }

    // 4. Delete the booking
    await booking.destroy({ transaction });

    await transaction.commit();
    console.log(`Booking with ID ${bookingId} successfully deleted.`);
    return res.status(200).json({ message: 'Booking removed successfully' });

  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting booking:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createSubUserBooking = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      parentUserId,     // ID of the parent (the inviter)
      subUserId,        // ID of the sub-user for whom the booking is being made
      serviceId,
      trainerId: providedTrainerId,
      address,
      participants = [],
      dates = [],
    } = req.body;

    // Validate required parameters
    if (!parentUserId || !subUserId || !serviceId) {
      return res.status(400).json({ message: 'Parent user ID, sub-user ID, and service ID are required' });
    }
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ message: 'At least one booking date is required' });
    }

    // Ensure the sub-user exists and belongs to the provided parent
    const subUser = await User.findByPk(subUserId, { attributes: ['id', 'parentUserId'] });
    if (!subUser) {
      throw new Error('Sub-user not found');
    }
    if (String(subUser.parentUserId) !== String(parentUserId)) {
      throw new Error('This sub-user is not associated with the provided parent user');
    }

    // Determine trainer: use the provided trainerId or fall back to the service default
    let trainerId = providedTrainerId;
    if (!trainerId) {
      const service = await Service.findByPk(serviceId);
      if (!service || !service.defaultTrainerId) {
        throw new Error('No trainer specified and no default trainer found for this service');
      }
      trainerId = service.defaultTrainerId;
    }
    // Validate that the trainer exists
    const trainer = await Trainer.findByPk(trainerId);
    if (!trainer) {
      throw new Error('Trainer not found');
    }

    let totalPrice = 0;
    const createdBookingDates = [];

    // Since this sub-user has already accepted the invitation,
    // we mark the booking as approved immediately.
    const isApproved = true;

    // Create a new booking using the sub-user's ID (rather than the parent’s)
    const booking = await Booking.create(
      {
        userId: subUserId,
        serviceId,
        trainerId,
        address,
        totalPrice: 0, // will update after calculating based on dates
        status: 'active',
        isBookingConfirmed: false,
        approved: isApproved,
      },
      { transaction }
    );

    // (Optional) Process participant data if provided
    const createdParticipants = [];
    if (participants && participants.length > 0) {
      // Normalize category names if needed using your helper
      const normalizedParticipants = participants.map((p) => ({
        ...p,
        category: normalizeCategory(p.category),
      }));
      for (const part of normalizedParticipants) {
        const participantRecord = await Participant.create(
          { ...part, bookingId: booking.id },
          { transaction }
        );
        createdParticipants.push(participantRecord);
      }
    }

    // Process each booking date
    for (const dateObj of dates) {
      const { date, startTime, endTime } = dateObj;
      if (!date || !startTime || !endTime) {
        throw new Error('Each date must include: { date, startTime, endTime }');
      }

      // Combine date and time for validation
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error('Invalid date or time format');
      }

      const hours = (endDateTime - startDateTime) / (1000 * 60 * 60);
      if (hours <= 0) {
        throw new Error('endTime must be after startTime');
      }

      totalPrice += hours * trainer.hourlyRate;

      // Create a BookingDate record
      const bookingDate = await BookingDate.create(
        {
          bookingId: booking.id,
          date,
          startTime,
          endTime,
        },
        { transaction }
      );
      createdBookingDates.push(bookingDate);
    }

    // Update the booking with the calculated total price
    await booking.update({ totalPrice }, { transaction });

    await transaction.commit();

    return res.status(201).json({
      message: 'Sub-user booking created successfully',
      booking: {
        id: booking.id,
        userId: booking.userId,
        serviceId: booking.serviceId,
        trainerId: booking.trainerId,
        address: booking.address,
        totalPrice: booking.totalPrice,
        approved: booking.approved,
        dates: createdBookingDates,
        participants: createdParticipants, // if any were added
      },
    });
  } catch (error) {
    console.error('Error creating sub-user booking:', error.message);
    if (transaction.finished !== 'commit') {
      await transaction.rollback();
    }
    return res.status(500).json({ error: error.message });
  }
};


exports.getSubUserBookings = async (req, res) => {
  try {
    const { parentUserId } = req.params;
    const { status } = req.query;

    // Step 1: Find all sub-users (users with this parentUserId)
    const subUsers = await User.findAll({
      where: { parentUserId },
      attributes: ['id'], // Only fetch user IDs
    });

    if (!subUsers || subUsers.length === 0) {
      return res.status(404).json({ message: 'No sub-users found for this parent user' });
    }

    // Extract sub-user IDs
    const subUserIds = subUsers.map((user) => user.id);

    // Step 2: Fetch bookings where userId is one of the sub-users
    const whereClause = {
      userId: { [Op.in]: subUserIds },
    };

    if (status) {
      whereClause.status = status;
    }

    const bookings = await Booking.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: BookingDate,
          attributes: ['date', 'startTime', 'endTime'],
        },
        {
          model: Participant,
          attributes: ['id', 'name', 'surname', 'age', 'category'],
        },
        {
          model: Service,
          attributes: ['id', 'name', 'description', 'image', 'duration', 'hourlyRate', 'level'],
          include: [
            {
              model: ServiceDetails,
              attributes: ['fullDescription', 'highlights', 'whatsIncluded', 'whatsNotIncluded', 'recommendations'],
            },
            {
              model: Trainer,
              attributes: ['id', 'name', 'surname', 'avatar', 'hourlyRate', 'userRating'],
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

    // Step 3: Return all bookings without pagination
    res.status(200).json({ bookings });
  } catch (error) {
    console.error('Error fetching sub-user bookings:', error);
    res.status(500).json({ error: 'Failed to fetch sub-user bookings' });
  }
};

exports.getSubUserBookingsByIds = async (req, res) => {
  try {
    const { parentUserId } = req.params;
    const { ids } = req.query;

    // 1) Validate presence of 'ids'
    if (!ids) {
      return res.status(400).json({ message: 'Booking IDs are required' });
    }

    // 2) Convert the comma-separated list of IDs to an array of numbers
    const bookingIds = ids.split(',').map((id) => Number(id.trim())).filter(Boolean);

    // 3) Find all sub-users for the given parentUserId
    const subUsers = await User.findAll({
      where: { parentUserId },
      attributes: ['id'], // Only fetch the user IDs
    });

    if (!subUsers || subUsers.length === 0) {
      return res.status(404).json({ message: 'No sub-users found for this parent user' });
    }

    // Extract the sub-user IDs into an array
    const subUserIds = subUsers.map((user) => user.id);

    // 4) Fetch bookings that match (a) the array of booking IDs, and (b) userId is in the subUser list
    const bookings = await Booking.findAll({
      where: {
        id: { [Op.in]: bookingIds },
        userId: { [Op.in]: subUserIds },
      },
      order: [['createdAt', 'DESC']], // Example order
      include: [
        {
          model: BookingDate,
          attributes: ['date', 'startTime', 'endTime'],
        },
        {
          model: Participant,
          attributes: ['id', 'name', 'surname', 'age', 'category'],
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
                'whatsToBring',
                'coachInfo',
              ],
            },
            {
              model: Trainer,
              attributes: [
                'id',
                'name',
                'surname',
                'avatar',
                'hourlyRate',
                'userRating',
              ],
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

    // 5) Check if bookings exist
    if (!bookings || bookings.length === 0) {
      return res
        .status(404)
        .json({ message: 'No bookings found for the given IDs and parent user' });
    }

    // 6) Send response
    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching sub-user bookings by IDs:', error);
    res.status(500).json({ error: 'Failed to fetch sub-user bookings by IDs' });
  }
};

exports.approveSubUserBooking = async (req, res) => {
  try {
      const { bookingId, parentUserId } = req.body;

      if (!bookingId || !parentUserId) {
          return res.status(400).json({ message: 'Booking ID and Parent User ID are required' });
      }

      // Find the booking by ID
      const booking = await Booking.findByPk(bookingId);
      if (!booking) {
          return res.status(404).json({ message: 'Booking not found' });
      }

      // Find the sub-user who made the booking
      const subUser = await User.findByPk(booking.userId);
      if (!subUser) {
          return res.status(404).json({ message: 'Sub-user not found' });
      }

      // Ensure the sub-user belongs to the parent user
      if (subUser.parentUserId !== parentUserId) {
          return res.status(403).json({ message: 'You are not authorized to approve this booking' });
      }

      // Set approved to true
      booking.approved = true;
      await booking.save();

      return res.status(200).json({
          message: 'Booking approved successfully',
          booking
      });
  } catch (error) {
      console.error('Error approving booking:', error);
      return res.status(500).json({ message: 'Internal server error' });
  }
};



exports.createGroupSessionBooking = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { userId, groupSessionId } = req.body;

    if (!userId || !groupSessionId) {
      return res.status(400).json({ message: 'User ID and Group Session ID are required' });
    }

    // Fetch group session details
    const groupSession = await GroupSession.findByPk(groupSessionId, {
      include: [
        { model: Trainer, as: 'Trainer' },
        { model: Service, as: 'Service' },
      ],
    });

    if (!groupSession) {
      return res.status(404).json({ message: 'Group session not found' });
    }

    // Check if the group session has available spots
    if (groupSession.currentEnrollment >= groupSession.maxGroupSize) {
      return res.status(400).json({ message: 'Group session is fully booked' });
    }

    // Calculate total price based on a single booking
    const totalPrice = groupSession.pricePerPerson;

    // Create the booking
    const booking = await Booking.create(
      {
        userId,
        serviceId: groupSession.serviceId,
        trainerId: groupSession.trainerId,
        address: groupSession.address,
        totalPrice,
        status: 'active',
        groupSessionId: groupSession.id,
      },
      { transaction }
    );

    // Increment currentEnrollment in the database
    await groupSession.increment('currentEnrollment', { by: 1, transaction });
    await groupSession.reload({ transaction }); // Ensure instance is updated

    console.log('Updated Enrollment:', groupSession.currentEnrollment); // Debugging log

    // Update group session status based on enrollment
    if (groupSession.currentEnrollment >= groupSession.maxGroupSize) {
      groupSession.status = 'completed'; // Fully booked
    } else {
      groupSession.status = 'active'; // Ongoing session
    }
    await groupSession.save({ transaction });

    // Create booking session (for auditing/group reference)
    await BookingDate.create(
      {
        date: groupSession.date,
        startTime: groupSession.startTime,
        endTime: groupSession.endTime,
        bookingId: booking.id,
      },
      { transaction }
    );

    await transaction.commit();

    // Return booking details
    res.status(201).json({
      message: 'Group session booking successful',
      booking: {
        bookingId: booking.id,
        userId: booking.userId,
        service: groupSession.Service,
        trainer: groupSession.Trainer,
        address: booking.address,
        totalPrice: booking.totalPrice,
        session: {
          date: groupSession.date,
          startTime: groupSession.startTime,
          endTime: groupSession.endTime,
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error booking group session:', error);
    res.status(500).json({ message: 'Failed to book group session', error: error.message });
  }
};





exports.getUserBookingsWithPagination = async (req, res) => {
  try {
    // Update past bookings before fetching
    await updatePastBookingsStatus();

    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query; // Default pagination values

    const offset = (page - 1) * limit;

    // Fetch bookings with pagination
    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: { userId },
      limit: parseInt(limit, 10),
      offset,
      order: [['createdAt', 'DESC']], // Show latest bookings first
      include: [
        {
          model: Participant,
        },
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
              attributes: ['id', 'name', 'surname', 'avatar', 'hourlyRate', 'userRating'],
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

    // Process bookings to include only the latest session
    const filteredBookings = bookings.map((booking) => ({
      ...booking.toJSON(),
      latestBookingDate: booking.BookingDates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0],
    }));

    res.status(200).json({
      totalItems: count,
      totalBookingsOnCurrentPage: bookings.length,
      totalPages: Math.ceil(count / parseInt(limit, 10)), // Fix calculation here
      currentPage: parseInt(page, 10),
      bookings: filteredBookings,
    });
  } catch (error) {
    console.error('Error fetching paginated bookings:', error);
    res.status(500).json({ error: 'Failed to fetch user bookings.' });
  }
};



exports.getPaginatedFilteredBookingsOfUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      categoryOrSubcategory,
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { userId };

    // -- 1) STATUS
    if (status) {
      whereClause.status = status;
    }

    // -- 2) DATES
    const bookingDateWhereClause = {};
    if (startDate) {
      bookingDateWhereClause.date = { [Op.gte]: startDate };
    }
    if (endDate) {
      bookingDateWhereClause.date = {
        ...(bookingDateWhereClause.date || {}),
        [Op.lte]: endDate,
      };
    }

    // Build the subCategory include
    const subCategoryInclude = {
      model: SubCategory,
      attributes: ['id', 'name'],
      include: [
        {
          model: Category,
          attributes: ['id', 'name'],
        },
      ],
      // If filtering by name
      required: false, // or true if you want to strictly match
    };

    if (categoryOrSubcategory) {
      subCategoryInclude.where = {
        [Op.or]: [
          { name: categoryOrSubcategory },          // SubCategory.name
          { '$Category.name$': categoryOrSubcategory }, // Category.name
        ],
      };
      // If you only want Bookings that definitely match either subcategory or category:
      subCategoryInclude.required = true;
    }

    // Build the main service include
    const serviceInclude = {
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
      // If you want the booking to definitely have a matching service if categoryOrSubcategory was provided:
      required: !!categoryOrSubcategory, 
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
          attributes: [
            'id',
            'name',
            'surname',
            'avatar',
            'hourlyRate',
            'userRating',
          ],
        },
        subCategoryInclude,
      ],
    };

    // Finally, run the query
    const { count, rows } = await Booking.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true, // avoids duplicated row inflation in the count
      include: [
        {
          model: Participant,
        },
        {
          model: BookingDate,
          where: Object.keys(bookingDateWhereClause).length
            ? bookingDateWhereClause
            : undefined,
          // If you want only Bookings that definitely have a date in the given range:
          required: Object.keys(bookingDateWhereClause).length > 0,
          attributes: ['date', 'startTime', 'endTime', 'createdAt'],
        },
        serviceInclude,
      ],
    });

        // Fetch group session data
        const groupSessionIds = [...new Set(rows.map((b) => b.groupSessionId))];
        const groupSessions = await GroupSession.findAll({
          where: {
            id: groupSessionIds,
          },
          attributes: ['id', 'maxGroupSize', 'currentEnrollment'],
        });
    
        const groupSessionMap = groupSessions.reduce((acc, session) => {
          acc[session.id] = session;
          return acc;
        }, {});
    
        // Map the results with group session data
        const filteredBookings = rows.map((booking) => ({
          ...booking.toJSON(),
          groupSessionData: groupSessionMap[booking.groupSessionId] || null,
          latestBookingDate: booking.BookingDates?.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )[0],
        }));

    res.json({
      totalItems: count,
      totalBookingsOnCurrentPage: rows.length,
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      currentPage: parseInt(page, 10),
      bookings: filteredBookings,
    });
  } catch (error) {
    console.error('Error fetching filtered bookings with pagination:', error);
    res.status(500).json({ error: 'Failed to fetch bookings with pagination.' });
  }
};




exports.getAllBookingsOfUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch all bookings for the user
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
              through: { attributes: [] },
              attributes: ['id', 'name', 'surname', 'avatar', 'hourlyRate', 'userRating'],
            },
            {
              model: SubCategory,
              attributes: ['id', 'name'],
              include: [{ model: Category, attributes: ['id', 'name'] }],
            },
          ],
        },
      ],
    });

    // Process each booking to include group session data if `groupSessionId` exists
    const updatedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const bookingData = booking.toJSON();

        if (booking.groupSessionId) {
          const groupSession = await GroupSession.findByPk(booking.groupSessionId, {
            attributes: ['id', 'date', 'startTime', 'endTime', 'maxGroupSize', 'currentEnrollment', 'status'],
            include: [
              { model: Trainer, attributes: ['id', 'name', 'surname'] },
              { model: Service, attributes: ['id', 'name', 'description', 'image'] },
            ],
          });

          bookingData.groupSession = groupSession || null;
        }

        return bookingData;
      })
    );

    res.status(200).json(updatedBookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: error.message });
  }
};






exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch booking by ID
    const booking = await Booking.findOne({
      where: { id },
      include: [
        {
          model: Participant,
          attributes: ['id', 'name', 'surname', 'age', 'category'],
        },
        {
          model: BookingDate,
          attributes: ['id', 'date', 'startTime', 'endTime'],
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
              through: { attributes: [] },
              attributes: ['id', 'name', 'surname', 'avatar', 'hourlyRate', 'userRating'],
            },
          ],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // If groupSessionId exists, fetch additional group session data
    if (booking.groupSessionId) {
      const groupSession = await GroupSession.findByPk(booking.groupSessionId, {
        attributes: ['id', 'date', 'startTime', 'endTime', 'maxGroupSize', 'currentEnrollment', 'status'],
        include: [
          { model: Trainer, attributes: ['id', 'name', 'surname'] },
          { model: Service, attributes: ['id', 'name', 'description', 'image'] },
        ],
      });

      booking.dataValues.groupSession = groupSession || null;
    }

    res.status(200).json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'An error occurred while fetching the booking.' });
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

      // Sort BookingDates by `date` and `endTime` to get the latest booking
      const validDates = booking.BookingDates.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.endTime}`);
        const dateB = new Date(`${b.date}T${b.endTime}`);
        return dateB - dateA; // Sort descending (latest first)
      }).slice(0, 1); // Take the most recent date

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
    console.error('Error fetching bookings by IDs:', error.message);
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

exports.getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();

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
              through: { attributes: [] },
            },
          ],
        },
        {
          model: BookingDate,
          attributes: ['date', 'startTime', 'endTime', 'createdAt'],
        },
        {
          model: GroupSession,
          as: 'GroupSession',
          attributes: ['id', 'date', 'startTime', 'endTime', 'maxGroupSize', 'currentEnrollment', 'status'],
        },
      ],
    });

    const categorizedBookings = {
      upcoming: [],
      past: [],
      canceled: [],
    };

    bookings.forEach((booking) => {
      if (booking.BookingDates.length > 0) {
        const latestDate = booking.BookingDates.reduce((latest, date) => {
          return new Date(date.date) > new Date(latest.date) ? date : latest;
        });

        const bookingDateTime = new Date(`${latestDate.date}T${latestDate.endTime}`);

        if (booking.status === 'canceled') {
          categorizedBookings.canceled.push(booking);
        } else if (bookingDateTime > currentDate) {
          categorizedBookings.upcoming.push(booking);
        } else {
          categorizedBookings.past.push(booking);
        }
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
    const { userId } = req.params;
    const { categoryOrSubcategory, startDate, endDate } = req.query;

    const bookings = await Booking.findAll({
      where: { userId },
      include: [
        {
          model: Participant,
        },
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

    const filteredBookings = bookings.filter((booking) => {
      let matches = true;

      if (categoryOrSubcategory) {
        const matchesCategoryOrSubcategory =
          booking.Service.SubCategory.name === categoryOrSubcategory ||
          booking.Service.SubCategory.Category.name === categoryOrSubcategory;
        matches = matches && matchesCategoryOrSubcategory;
      }

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

    // Append group session data to filtered bookings with groupSessionId
    for (const booking of filteredBookings) {
      if (booking.groupSessionId) {
        const groupSession = await GroupSession.findByPk(booking.groupSessionId, {
          attributes: ['id', 'date', 'startTime', 'endTime', 'maxGroupSize', 'currentEnrollment', 'status'],
          include: [
            { model: Trainer, attributes: ['id', 'name', 'surname'] },
            { model: Service, attributes: ['id', 'name', 'description', 'image'] },
          ],
        });
        booking.dataValues.groupSession = groupSession || null;
      }
    }

    res.status(200).json(filteredBookings);
  } catch (error) {
    console.error('Error fetching filtered bookings:', error);
    res.status(500).json({ error: error.message });
  }
};


exports.getUserBookingsByDates = async (req, res) => {
  try {
    const { userId } = req.params;
    const { dates } = req.body;

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: 'No dates provided' });
    }

    const bookings = await Booking.findAll({
      where: { userId },
      include: [
        {
          model: BookingDate,
          where: { date: { [Op.in]: dates } },
          attributes: ['date', 'startTime', 'endTime', 'createdAt'],
        },
        {
          model: Participant,
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
              through: { attributes: [] },
              attributes: ['id', 'name', 'surname', 'avatar', 'hourlyRate', 'userRating'],
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
