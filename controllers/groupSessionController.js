// controllers/groupSessionController.js

const GroupSession = require('../models/GroupSessions/GroupSession');
const { Service, ServiceTrainer } = require('../models/Services/Service');
const Trainer = require('../models/Trainer/Trainer');
const Booking = require('../models/Bookings/Booking');
const { Op } = require('sequelize');

/**
 * Create a new group session (trainer side)
 */
// exports.createGroupSession = async (req, res) => {
//     try {
//       const { trainerId, serviceId, date, startTime, endTime, maxGroupSize, pricePerPerson } = req.body;
  
//       // Calculate duration in minutes (endTime - startTime)
//       const duration = Math.abs(
//         new Date(`1970-01-01T${endTime}Z`) - new Date(`1970-01-01T${startTime}Z`)
//       ) / (1000 * 60);
  
//       const groupSession = await GroupSession.create({
//         trainerId,
//         serviceId,
//         date,
//         startTime,
//         endTime,
//         duration, // Add calculated duration
//         maxGroupSize,
//         pricePerPerson,
//         status: 'scheduled' // default
//       });
  
//       res.status(201).json(groupSession);
//     } catch (error) {
//       console.error('Error creating group session:', error);
//       res.status(500).json({ error: error.message });
//     }
//   };
  
exports.createGroupSession = async (req, res) => {
    try {
      const { trainerId, serviceId, date, startTime, endTime, maxGroupSize, pricePerPerson } = req.body;
  
      // Check if the trainer is associated with the service
      const serviceTrainer = await ServiceTrainer.findOne({
        where: { serviceId, trainerId },
      });
  
      if (!serviceTrainer) {
        return res.status(400).json({ message: 'Trainer is not associated with the selected service' });
      }
  
      // Calculate duration in minutes (endTime - startTime)
      const duration = Math.abs(
        new Date(`1970-01-01T${endTime}Z`) - new Date(`1970-01-01T${startTime}Z`)
      ) / (1000 * 60);
  
      const groupSession = await GroupSession.create({
        trainerId,
        serviceId,
        date,
        startTime,
        endTime,
        duration, // Add calculated duration
        maxGroupSize,
        pricePerPerson,
        status: 'scheduled', // default
      });
  
      res.status(201).json(groupSession);
    } catch (error) {
      console.error('Error creating group session:', error);
      res.status(500).json({ error: error.message });
    }
  };
  

/**
 * Update an existing group session (trainer side)
 */
exports.updateGroupSession = async (req, res) => {
    try {
      const { id } = req.params; // groupSessionId
      const { date, startTime, endTime, maxGroupSize, pricePerPerson, status } = req.body;
  
      const groupSession = await GroupSession.findByPk(id);
      if (!groupSession) {
        return res.status(404).json({ message: 'Group session not found' });
      }
  
      if (date) groupSession.date = date;
      if (startTime) groupSession.startTime = startTime;
      if (endTime) groupSession.endTime = endTime;
  
      // Recalculate duration if startTime or endTime are updated
      if (startTime || endTime) {
        groupSession.duration = Math.abs(
          new Date(`1970-01-01T${groupSession.endTime}Z`) - new Date(`1970-01-01T${groupSession.startTime}Z`)
        ) / (1000 * 60);
      }
  
      if (maxGroupSize) groupSession.maxGroupSize = maxGroupSize;
      if (pricePerPerson) groupSession.pricePerPerson = pricePerPerson;
      if (status) groupSession.status = status;
  
      await groupSession.save();
      res.status(200).json(groupSession);
    } catch (error) {
      console.error('Error updating group session:', error);
      res.status(500).json({ error: error.message });
    }
  };
  
/**
 * Delete a group session (trainer side), if desired
 */
exports.deleteGroupSession = async (req, res) => {
  try {
    const { id } = req.params;
    const groupSession = await GroupSession.findByPk(id);

    if (!groupSession) {
      return res.status(404).json({ message: 'Group session not found' });
    }

    // If the session already has enrollments, you might handle differently:
    // if (groupSession.currentEnrollment > 0) { ... }

    await groupSession.destroy();
    res.status(200).json({ message: 'Group session deleted successfully' });
  } catch (error) {
    console.error('Error deleting group session:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Fetch all group sessions (for admin or general listing)
 */
exports.getAllGroupSessions = async (req, res) => {
    try {
      const groupSessions = await GroupSession.findAll({
        include: [
          { model: Trainer, attributes: ['id', 'name', 'surname', 'avatar'] },
          { model: Service, attributes: ['id', 'name', 'description'] }
        ],
        attributes: ['id', 'date', 'startTime', 'endTime', 'duration', 'maxGroupSize', 'currentEnrollment', 'pricePerPerson'], // Include duration
        order: [['date', 'ASC'], ['startTime', 'ASC']]
      });
      res.status(200).json(groupSessions);
    } catch (error) {
      console.error('Error fetching all group sessions:', error);
      res.status(500).json({ error: error.message });
    }
  };
  
/**
 * Fetch a single group session by ID
 */
exports.getGroupSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const groupSession = await GroupSession.findByPk(id, {
      include: [
        { model: Trainer, attributes: ['id', 'name', 'surname', 'avatar'] },
        { model: Service, attributes: ['id', 'name', 'description'] }
      ]
    });

    if (!groupSession) {
      return res.status(404).json({ message: 'Group session not found' });
    }

    res.status(200).json(groupSession);
  } catch (error) {
    console.error('Error fetching group session by ID:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Fetch all group sessions for a specific service
 */
// exports.getGroupSessionsForService = async (req, res) => {
//     try {
//         const { serviceId } = req.params;

//         const groupSessions = await GroupSession.findAll({
//             where: { serviceId },
//             include: [
//                 { model: Trainer, attributes: ['id', 'name', 'surname', 'avatar', 'userRating'] },
//                 { model: Service, attributes: ['id', 'name', 'description', 'image'] },
//             ],
//             order: [['date', 'ASC'], ['startTime', 'ASC']],
//         });

//         const timeSlots = groupSessions
//             .map(session => ({
//                 startTime: session.startTime,
//                 endTime: session.endTime,
//                 formattedSlot: `${formatTime(session.startTime)} - ${formatTime(session.endTime)}`,
//             }))
//             .reduce((acc, slot) => {
//                 const exists = acc.some(
//                     s => s.startTime === slot.startTime && s.endTime === slot.endTime
//                 );
//                 if (!exists) acc.push(slot);
//                 return acc;
//             }, []);

//         const durations = groupSessions
//             .map(session => ({
//                 duration: session.duration,
//                 label: `${session.duration} hour${session.duration > 1 ? 's' : ''}`,
//             }))
//             .reduce((acc, duration) => {
//                 const exists = acc.some(d => d.duration === duration.duration);
//                 if (!exists) acc.push(duration);
//                 return acc;
//             }, []);

//         res.status(200).json({ groupSessions, timeSlots, durations });
//     } catch (error) {
//         console.error('Error fetching group sessions for service:', error);
//         res.status(500).json({ error: error.message });
//     }
// };
  
exports.getGroupSessionsForService = async (req, res) => {
    try {
        const { serviceId } = req.params;

        // Get trainers associated with the service
        const serviceTrainers = await ServiceTrainer.findAll({
            where: { serviceId },
            attributes: ['trainerId'],
        });

        const trainerIds = serviceTrainers.map(st => st.trainerId);

        // Fetch group sessions linked to the trainers of the service
        const groupSessions = await GroupSession.findAll({
            where: { serviceId },
            include: [
                {
                    model: Trainer,
                    where: { id: trainerIds }, // Only trainers associated with the service
                    attributes: ['id', 'name', 'surname', 'avatar', 'userRating'],
                },
                {
                    model: Service,
                    attributes: ['id', 'name', 'description', 'image'],
                },
            ],
            order: [['date', 'ASC'], ['startTime', 'ASC']],
        });

        // Extract and format time slots
        const timeSlots = groupSessions
            .map(session => ({
                startTime: session.startTime,
                endTime: session.endTime,
                formattedSlot: `${formatTime(session.startTime)} - ${formatTime(session.endTime)}`,
            }))
            .reduce((acc, slot) => {
                const exists = acc.some(
                    s => s.startTime === slot.startTime && s.endTime === slot.endTime
                );
                if (!exists) acc.push(slot);
                return acc;
            }, []);

        // Extract and format durations
        const durations = groupSessions
            .map(session => ({
                duration: session.duration,
                label: `${session.duration} hour${session.duration > 1 ? 's' : ''}`,
            }))
            .reduce((acc, duration) => {
                const exists = acc.some(d => d.duration === duration.duration);
                if (!exists) acc.push(duration);
                return acc;
            }, []);

        res.status(200).json({ groupSessions, timeSlots, durations });
    } catch (error) {
        console.error('Error fetching group sessions for service:', error);
        res.status(500).json({ error: error.message });
    }
};

// Helper function to format time in AM/PM
function formatTime(time) {
    const [hour, minute] = time.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${String(minute).padStart(2, '0')} ${ampm}`;
}

  

  // Helper function to format time in AM/PM
  function formatTime(time) {
    const [hour, minute] = time.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12; // Convert 0 to 12 for midnight
    return `${formattedHour}:${String(minute).padStart(2, '0')} ${ampm}`;
  }
  
  
/**
 * User joins a group session (creates a Booking referencing groupSessionId)
 */
exports.joinGroupSession = async (req, res) => {
  try {
    const { groupSessionId } = req.params;
    const { userId, participantsCount = 1 } = req.body; 
    // participantsCount: how many seats user is booking

    // Fetch the group session
    const groupSession = await GroupSession.findByPk(groupSessionId);
    if (!groupSession) {
      return res.status(404).json({ message: 'Group session not found' });
    }

    if (groupSession.status !== 'scheduled') {
      return res.status(400).json({ message: 'Group session is not open for enrollment' });
    }

    // Check capacity
    const newEnrollment = groupSession.currentEnrollment + participantsCount;
    if (newEnrollment > groupSession.maxGroupSize) {
      return res.status(400).json({ message: 'Not enough seats available' });
    }

    // Calculate total price
    const totalPrice = groupSession.pricePerPerson * participantsCount;

    // Create a booking referencing this group session
    const booking = await Booking.create({
      userId,
      serviceId: groupSession.serviceId,
      trainerId: groupSession.trainerId,
      groupSessionId: groupSession.id,
      totalPrice,
      status: 'active'
    });

    // Update enrollment count
    groupSession.currentEnrollment = newEnrollment;
    await groupSession.save();

    res.status(201).json({
      message: 'Joined group session successfully',
      booking,
      groupSession
    });
  } catch (error) {
    console.error('Error joining group session:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Cancel a user’s group booking (free up seats)
 */
exports.cancelGroupBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Find the booking, include the associated group session
    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: GroupSession, as: 'GroupSession' }]
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if it's actually a group booking
    if (!booking.groupSessionId || !booking.GroupSession) {
      return res.status(400).json({ message: 'This is not a group session booking' });
    }

    // Mark booking as canceled
    booking.status = 'canceled';
    await booking.save();

    // Decrement the group's currentEnrollment (assuming 1 seat per booking or you store participantsCount)
    // For a more robust approach, store `participantsCount` in the Booking model.
    const seatsFreed = 1; // or booking.participantsCount
    const groupSession = booking.GroupSession;
    groupSession.currentEnrollment = Math.max(0, groupSession.currentEnrollment - seatsFreed);
    await groupSession.save();

    res.status(200).json({
      message: 'Group booking canceled successfully',
      booking,
      groupSession
    });
  } catch (error) {
    console.error('Error canceling group booking:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/group-sessions/filter
 * Optional query params:
 *  - startDate (YYYY-MM-DD)
 *  - endDate (YYYY-MM-DD)
 *  - date (YYYY-MM-DD)
 *  - address (string)
 */

exports.getFilteredGroupSessions = async (req, res) => {
    try {
      const { date, address } = req.query;
  
      // Build a dynamic WHERE clause
      const whereClause = {};
  
      // 1) Filter by exact date if provided
      if (date) {
        whereClause.date = date;
      }
  
      // 2) Filter by address if provided (partial match, case-insensitive)
      if (address) {
        // If you're using Postgres, [Op.iLike] works for case-insensitive.
        // If MySQL, you can use [Op.like] and handle case sensitivity as needed.
        whereClause.address = { [Op.iLike]: `%${address}%` };
      }
  
      // Fetch group sessions with optional filters
      const groupSessions = await GroupSession.findAll({
        where: whereClause,
        include: [
          {
            model: Trainer,
            attributes: ['id', 'name', 'surname', 'avatar','userRating'],
          },
          {
            model: Service,
            attributes: ['id', 'name', 'description', 'image', 'duration', 'hourlyRate'],
          },
        ],
        order: [['date', 'ASC'], ['startTime', 'ASC']],
      });


      
  
      res.status(200).json(groupSessions);
    } catch (error) {
      console.error('Error fetching filtered group sessions:', error);
      res.status(500).json({ error: error.message });
    }
  };

  exports.getFilteredGroupSessionsForService = async (req, res) => {
    try {
      const { serviceId } = req.params;
      const { date, address, duration, startTime, endTime } = req.query;
  
      const whereClause = {
        serviceId: serviceId,
      };
  
      if (date) {
        whereClause.date = date;
      }
  
      if (address) {
        whereClause.address = { [Op.like]: `%${address}%` };
      }
  
      if (duration) {
        whereClause.duration = duration; // Filter by exact duration
      }
  
      if (startTime && endTime) {
        whereClause[Op.and] = [
          { startTime: { [Op.gte]: startTime } },
          { endTime: { [Op.lte]: endTime } },
        ];
      }
  
      const groupSessions = await GroupSession.findAll({
        where: whereClause,
        include: [
          { model: Trainer, attributes: ['id', 'name', 'surname', 'avatar','userRating'] },
          { model: Service, attributes: ['id', 'name', 'description', 'image', 'duration', 'hourlyRate'] },
        ],
        attributes: ['id', 'date', 'startTime', 'endTime', 'duration', 'maxGroupSize', 'pricePerPerson'], // Include duration
        order: [['date', 'ASC'], ['startTime', 'ASC']],
      });
  
      const timeSlots = groupSessions
        .map(session => ({
          startTime: session.startTime,
          endTime: session.endTime,
        }))
        .reduce((acc, slot) => {
          const exists = acc.some(
            s => s.startTime === slot.startTime && s.endTime === slot.endTime
          );
          if (!exists) acc.push(slot);
          return acc;
        }, []);
  
      res.status(200).json({ groupSessions, timeSlots });
    } catch (error) {
      console.error('Error fetching filtered group sessions:', error);
      res.status(500).json({ error: error.message });
    }
  };
  