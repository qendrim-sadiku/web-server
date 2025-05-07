const Trainer = require('../../models/Trainer/Trainer');
const Review = require('../../models/Trainer/Review'); // Assuming Review model exists
const Booking = require('../../models/Bookings/Booking'); // Assuming Booking model exists
const BookingDate = require('../../models/Bookings/BookingDate');
const User = require('../../models/User'); // Import the User model
const { ServiceTrainer } = require('../../models/Services/Service');




// Get all trainers by category with optional filtering by age group
exports.getTrainersByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { ageGroup } = req.query; // Optional age group filtering

    const whereClause = { categoryId };

    if (ageGroup) {
      whereClause.ageGroup = ageGroup; // Filter by age group if provided
    }

    const trainers = await Trainer.findAll({ where: whereClause });
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

// Get all trainers with their reviews, total bookings, and average rating
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
        ageGroup: trainer.ageGroup // Include ageGroup in the response
      };
    });

    res.status(200).json(trainersWithRatings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get trainer details along with availability, reviews, and last booked information
exports.getTrainerDetails = async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;

  const today = new Date();
  const selectedDate = date ? date : today.toISOString().split('T')[0];

  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().split('T')[0];

  try {
    const trainer = await Trainer.findByPk(id, {
      include: [
        {
          model: Review,
          include: [{ model: User, attributes: ['username', 'name', 'surname', 'avatar'] }],
          
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

    // Find the last booking by sorting booking dates in descending order
    const lastBooking = await Booking.findOne({
      where: { trainerId: id },
      order: [['createdAt', 'DESC']], // Assuming `createdAt` stores the booking creation date
      include: [
        {
          model: BookingDate,
          attributes: ['date', 'startTime', 'endTime'],
        },
      ],
    });

    const reviews = trainer.Reviews || [];
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    const totalBookings = trainer.Bookings.length;

    let availabilityToday = generateHourlySlots('08:00', '20:00');
    let availabilityTomorrow = generateHourlySlots('08:00', '20:00');

    trainer.Bookings.forEach(booking => {
      booking.BookingDates.forEach(bookingDate => {
        if (bookingDate.date === selectedDate) {
          availabilityToday = removeBookedSlots(availabilityToday, bookingDate.startTime, bookingDate.endTime);
        }
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
      availabilityTomorrow,
      lastBooking, // Include the last booking information
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add a review for a specific trainer
exports.addReview = async (req, res) => {
  const { trainerId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id;

  try {
    const trainer = await Trainer.findByPk(trainerId);
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

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
  const { id } = req.params;

  try {
    const booking = await Booking.findByPk(id, {
      include: [{
        model: BookingDate,
        attributes: ['date', 'startTime', 'endTime'],
      }]
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = 'canceled';
    await booking.save();

    const trainerId = booking.trainerId;
    await recalculateTrainerAvailability(trainerId);

    res.status(200).json({ message: 'Booking canceled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const recalculateTrainerAvailability = async (trainerId) => {
  try {
    const trainer = await Trainer.findByPk(trainerId, {
      include: [{
        model: Booking,
        include: [{
          model: BookingDate,
          attributes: ['date', 'startTime', 'endTime'],
        }],
        where: { status: 'active' },
      }],
    });

    if (!trainer) {
      console.log('Trainer not found during availability recalculation.');
      return;
    }

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

    const bookingCount = await Booking.count({
      where: { trainerId: trainerId }
    });

    res.status(200).json({ trainerId, bookingCount });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching the bookings count.' });
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

    currentTime += 100;
  }

  return slots;
}

function removeBookedSlots(availability, startTime, endTime) {
  return availability.filter(slot => {
    const slotStartTime = parseTime(slot.startTime);
    const slotEndTime = parseTime(slot.endTime);

    const bookedStartTime = parseTime(startTime);
    const bookedEndTime = parseTime(endTime);

    return !(slotStartTime < bookedEndTime && slotEndTime > bookedStartTime);
  });
}

function filterPastSlots(availability) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  return availability.filter(slot => {
    const [slotHour, slotMinutes] = slot.startTime.split(':').map(Number);

    if (slotHour > currentHour) {
      return true;
    } else if (slotHour === currentHour && slotMinutes >= currentMinutes) {
      return true;
    }

    return false;
  });
}

// Get trainer availability with date filtering
exports.getTrainerAvailability = async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;

  const today = new Date();
  const selectedDate = date ? date : today.toISOString().split('T')[0];
 
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

    let availabilityToday = generateHourlySlots('08:00', '20:00');
    let availabilityTomorrow = generateHourlySlots('08:00', '20:00');
    let availabilitySelectedDate = generateHourlySlots('08:00', '20:00');

    if (selectedDate === today.toISOString().split('T')[0]) {
      availabilityToday = filterPastSlots(availabilityToday);
    }

    trainer.Bookings.forEach(booking => {
      booking.BookingDates.forEach(bookingDate => {
        if (bookingDate.date === today.toISOString().split('T')[0]) {
          availabilityToday = removeBookedSlots(availabilityToday, bookingDate.startTime, bookingDate.endTime);
        }
        if (bookingDate.date === tomorrowDate) {
          availabilityTomorrow = removeBookedSlots(availabilityTomorrow, bookingDate.startTime, bookingDate.endTime);
        }
        if (bookingDate.date === selectedDate) {
          availabilitySelectedDate = removeBookedSlots(availabilitySelectedDate, bookingDate.startTime, bookingDate.endTime);
        }
      });
    });

    res.status(200).json({
      availabilityToday,
      availabilityTomorrow,
      availabilitySelectedDate,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getMultipleTrainersAvailability = async (req, res) => {

  
  const { trainerIds, date } = req.body;

  if (!date) {
    return res.status(400).json({ message: 'Date is required' });
  }

  try {
    const trainers = await Trainer.findAll({
      where: { id: trainerIds },
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

    if (!trainers || trainers.length === 0) {
      return res.status(404).json({ message: 'No trainers found' });
    }

    const availability = {};

    trainers.forEach(trainer => {
      // Generate all time slots for the day with AM/PM
      const generateHourlySlots = (start, end) => {
        const slots = [];
        let [startHours, startMinutes] = start.split(':').map(Number);
        let [endHours] = end.split(':').map(Number);

        while (startHours < endHours) {
          const startTime = `${(startHours % 12 || 12)}:${startMinutes
            .toString()
            .padStart(2, '0')} ${startHours >= 12 ? 'PM' : 'AM'}`;
          const endTime = `${((startHours + 1) % 12 || 12)}:${startMinutes
            .toString()
            .padStart(2, '0')} ${startHours + 1 >= 12 ? 'PM' : 'AM'}`;

          slots.push({ startTime, endTime });
          startHours++;
        }

        return slots;
      };

      let availabilitySelectedDate = generateHourlySlots('08:00', '20:00').map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: true, // Default to true
      }));

      // Mark unavailable slots
      trainer.Bookings.forEach(booking => {
        booking.BookingDates.forEach(bookingDate => {
          if (bookingDate.date === date) {
            availabilitySelectedDate = availabilitySelectedDate.map(slot => {
              const [slotStartHours, slotStartMinutes] = slot.startTime.split(/[: ]/).map(Number);
              const [slotEndHours, slotEndMinutes] = slot.endTime.split(/[: ]/).map(Number);
              const [bookedStartHours, bookedStartMinutes] = bookingDate.startTime
                .split(':')
                .map(Number);
              const [bookedEndHours, bookedEndMinutes] = bookingDate.endTime.split(':').map(Number);

              const slotStartTime = new Date().setHours(
                slotStartHours + (slot.startTime.includes('PM') && slotStartHours !== 12 ? 12 : 0),
                slotStartMinutes
              );
              const slotEndTime = new Date().setHours(
                slotEndHours + (slot.endTime.includes('PM') && slotEndHours !== 12 ? 12 : 0),
                slotEndMinutes
              );
              const bookedStartTime = new Date().setHours(bookedStartHours, bookedStartMinutes);
              const bookedEndTime = new Date().setHours(bookedEndHours, bookedEndMinutes);

              if (slotStartTime < bookedEndTime && slotEndTime > bookedStartTime) {
                return { ...slot, isAvailable: false };
              }

              return slot;
            });
          }
        });
      });

      // Include trainer's availability
      availability[trainer.id] = {
        name: trainer.name,
        surname: trainer.surname,
        availabilitySelectedDate,
      };
    });

    res.status(200).json(availability);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// exports.createTrainer = async (req, res) => {
//   try {
//     const {
//       userId,
//       type,
//       backgroundCheck,
//       name,
//       surname,
//       description,
//       avatar,
//       userRating,
//       specialization,
//       level,
//       hourlyRate,
//       categoryId,
//       subcategoryId,
//       gender,
//       skills,
//       yearsOfExperience,
//       certification,
//       ageGroup,
//       ssn,
//       typeOfServiceProvider,
//       certificationStatus,
//       providerCategory,
//       availability,
//       style,
//       experience,
//       distance,
//       serviceAvailability,
//       location,
//       settings,
//       serviceFormat,
//       groupRange,
//       duration,
//       customDurationHours,
//       features,
//       expertise,
//       equipment,
//       trainingAids,
//       protectiveGear,
//       accessories,
//       degree,
//       fieldOfStudy,
//       titles,
//       tennisCertification,
//       languages,
//       serviceIds // <-- REQUIRED to assign this trainer to services
//     } = req.body;

//     // Create the trainer
//     const newTrainer = await Trainer.create({
//       userId,
//       type,
//       backgroundCheck,
//       name,
//       surname,
//       description,
//       avatar,
//       userRating,
//       specialization,
//       level,
//       hourlyRate,
//       categoryId,
//       subcategoryId,
//       gender,
//       skills,
//       yearsOfExperience,
//       certification,
//       ageGroup,
//       ssn,
//       typeOfServiceProvider,
//       certificationStatus,
//       providerCategory,
//       availability,
//       style,
//       experience,
//       distance,
//       serviceAvailability,
//       location,
//       settings,
//       serviceFormat,
//       groupRangeFrom: groupRange?.from || null,
//       groupRangeTo: groupRange?.to || null,
//       duration,
//       customDurationHours,
//       features,
//       expertise,
//       equipment,
//       trainingAids,
//       protectiveGear,
//       accessories,
//       degree,
//       fieldOfStudy,
//       titles,
//       tennisCertification,
//       languages
//     });

//     // Assign to services
//     if (serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0) {
//       const serviceTrainerLinks = serviceIds.map(serviceId => ({
//         serviceId,
//         trainerId: newTrainer.id
//       }));
//       await ServiceTrainer.bulkCreate(serviceTrainerLinks);
//     }

//     res.status(201).json({
//       message: 'Trainer created and assigned to services successfully',
//       trainer: newTrainer
//     });
//   } catch (error) {
//     console.error('Error creating trainer:', error);
//     res.status(500).json({ error: 'Failed to create trainer' });
//   }
// };

exports.createTrainer = async (req, res) => {
  try {
    const userId = req.user.id;

    // 👤 Get full name and user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // ✅ Update user role to 'trainer'
    await user.update({ role: 'trainer' });

    const fullName = user.name || '';
    const nameParts = fullName.trim().split(' ');
    const name = nameParts[0] || 'Unknown';
    const surname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

    const data = req.body;
    const specifications = data.serviceProviderSpecifications || {};
    const equipments = data.serviceProviderEquipments || {};
    const prices = data.servicePrices || {};
    const profileInfo = data.serviceProfileInformation || {};

    const experienceMap = {
      '0–2 years': 1,
      '3–5 years': 4,
      '6–10 years': 7,
      '10+ years': 11
    };
    const yearsOfExperience = experienceMap[specifications.experience] || 0;

    const existingTrainer = await Trainer.findOne({ where: { userId } });
    if (existingTrainer) {
      return res.status(400).json({ error: 'A trainer with this user already exists.' });
    }

    const trainer = await Trainer.create({
      userId,
      name,
      surname,
      type: data.type === 'individual' ? 'Individual' : 'Business',
      backgroundCheck: '',
      description: 'Professional trainer offering tailored services.',
      avatar: '',
      userRating: 0,
      specialization: specifications.features?.[0] || 'General',
      level: 'Pro',
      hourlyRate: prices.basePrice || 0,
      categoryId: data.selectedCategoryId,
      subcategoryId: data.selectedSubcategoryIds?.[0],
      gender: 'Male',
      skills: [],
      yearsOfExperience,
      certification: specifications.certificationStatus || '',
      ageGroup: specifications.ageGroup?.[0] || 'Adults',
      ssn: data.individualData?.ssn || null,
      typeOfServiceProvider: specifications.typeOfServiceProvider || '',
      certificationStatus: specifications.certificationStatus || '',
      providerCategory: specifications.providerCategory || '',
      availability: specifications.availability || '',
      style: specifications.style || '',
      distance: specifications.distance || '',
      serviceAvailability: specifications.serviceAvailability || [],
      location: specifications.location || [],
      settings: specifications.settings || [],
      serviceFormat: specifications.serviceFormat || [],
      groupRangeFrom: specifications.groupRange?.from || null,
      groupRangeTo: specifications.groupRange?.to || null,
      duration: specifications.duration || '',
      customDurationHours: specifications.customDurationHours || null,
      features: specifications.features || [],
      expertise: specifications.expertise || [],
      equipment: equipments.equipment || [],
      trainingAids: equipments.trainingAids || [],
      protectiveGear: equipments.protectiveGear || [],
      accessories: equipments.accessories || [],
      degree: profileInfo.degree || '',
      fieldOfStudy: profileInfo.fieldOfStudy || '',
      titles: profileInfo.titles || [],
      tennisCertification: profileInfo.tennisCertification || '',
      languages: profileInfo.languages || [],
      basePrice: prices.basePrice || 0,
      weekendPrice: prices.weekendPrice || 0,
      additionalPersonPrice: prices.additionalPersonPrice || 0,
      discounts: prices.discounts || {},
      advancedOrderDiscount: prices.advancedOrderDiscount || {},
      additionalFees: prices.additionalFees || {}
    });

    if (Array.isArray(data.selectedServices) && data.selectedServices.length > 0) {
      const links = data.selectedServices.map(serviceId => ({
        serviceId,
        trainerId: trainer.id
      }));
      await ServiceTrainer.bulkCreate(links);
    }

    return res.status(201).json({
      message: 'Trainer created successfully.',
      trainer
    });

  } catch (error) {
    console.error('Error creating trainer:', error);
    return res.status(500).json({ error: 'Failed to create trainer.' });
  }
};


exports.updateTrainer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const trainer = await Trainer.findByPk(id);
    if (!trainer) {
      return res.status(404).json({ error: 'Trainer not found' });
    }

    // Update trainer data
    await trainer.update({
      ...updates,
      groupRangeFrom: updates.groupRange?.from || null,
      groupRangeTo: updates.groupRange?.to || null
    });

    res.json({ message: 'Trainer updated successfully', trainer });
  } catch (error) {
    console.error('Error updating trainer:', error);
    res.status(500).json({ error: 'Failed to update trainer' });
  }
};


exports.deleteTrainer = async (req, res) => {
  try {
    const { id } = req.params;

    const trainer = await Trainer.findByPk(id);
    if (!trainer) {
      return res.status(404).json({ error: 'Trainer not found' });
    }

    await trainer.destroy();
    res.json({ message: 'Trainer deleted successfully' });
  } catch (error) {
    console.error('Error deleting trainer:', error);
    res.status(500).json({ error: 'Failed to delete trainer' });
  }
};


exports.getTrainerByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const trainer = await Trainer.findOne({ where: { userId } });

    if (!trainer) {
      return res.status(404).json({ error: 'Trainer not found for this user' });
    }

    res.json({
      trainerId: trainer.id,
      userId: trainer.userId,
      ...trainer.toJSON()
    });
  } catch (error) {
    console.error('Error fetching trainer by userId:', error);
    res.status(500).json({ error: 'Server error while fetching trainer' });
  }
};

exports.findTrainerByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const trainer = await Trainer.findOne({ where: { userId } });

    if (!trainer) {
      return res.status(404).json({ error: 'Trainer not found for this user' });
    }

    res.status(200).json({
      trainerId: trainer.id,
      userId: trainer.userId,
      name: trainer.name,
      surname: trainer.surname
    });
  } catch (error) {
    console.error('Error in findTrainerByUserId:', error);
    res.status(500).json({ error: 'Internal server error while fetching trainer by userId' });
  }
};
