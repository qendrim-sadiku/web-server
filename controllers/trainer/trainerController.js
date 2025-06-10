const Trainer = require('../../models/Trainer/Trainer');
const Review = require('../../models/Trainer/Review'); // Assuming Review model exists
const Booking = require('../../models/Bookings/Booking'); // Assuming Booking model exists
const BookingDate = require('../../models/Bookings/BookingDate');
const User = require('../../models/User'); // Import the User model
const { ServiceTrainer, Service } = require('../../models/Services/Service');
const saveBase64Image = require('../../util/saveBase64Image');
const ServiceDetails     = require('../../models/Services/ServiceDetails');
const Category = require('../../models/Category/Category');
const SubCategory = require('../../models/Category/SubCategory');




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

// exports.createTrainer = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     // 👤 Get full name and user
//     const user = await User.findByPk(userId);
//     if (!user) {
//       return res.status(404).json({ error: 'User not found.' });
//     }

//     // ✅ Update user role to 'trainer'
//     await user.update({ role: 'trainer' });

//     const fullName = user.name || '';
//     const nameParts = fullName.trim().split(' ');
//     const name = nameParts[0] || 'Unknown';
//     const surname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

//     const data = req.body;
//     const specifications = data.serviceProviderSpecifications || {};
//     const equipments = data.serviceProviderEquipments || {};
//     const prices = data.servicePrices || {};
//     const profileInfo = data.serviceProfileInformation || {};

//     const experienceMap = {
//       '0–2 years': 1,
//       '3–5 years': 4,
//       '6–10 years': 7,
//       '10+ years': 11
//     };
//     const yearsOfExperience = experienceMap[specifications.experience] || 0;

//     const existingTrainer = await Trainer.findOne({ where: { userId } });
//     if (existingTrainer) {
//       return res.status(400).json({ error: 'A trainer with this user already exists.' });
//     }

//     const trainer = await Trainer.create({
//       userId,
//       name,
//       surname,
//       type: data.type === 'individual' ? 'Individual' : 'Business',
//       avatar: profileInfo.avatarUrl || '', // ✅ SETTING THE AVATAR HERE

//       backgroundCheck: '',
//       description: 'Professional trainer offering tailored services.',
//       userRating: 0,
//       specialization: specifications.features?.[0] || 'General',
//       level: 'Pro',
//       hourlyRate: prices.basePrice || 0,
//       categoryId: data.selectedCategoryId,
//       subcategoryId: data.selectedSubcategoryIds?.[0],
//       gender: 'Male',
//       skills: [],
//       yearsOfExperience,
//       certification: specifications.certificationStatus || '',
//       ageGroup: specifications.ageGroup?.[0] || 'Adults',
//       ssn: data.individualData?.ssn || null,
//       typeOfServiceProvider: specifications.typeOfServiceProvider || '',
//       certificationStatus: specifications.certificationStatus || '',
//       providerCategory: specifications.providerCategory || '',
//       availability: specifications.availability || '',
//       style: specifications.style || '',
//       distance: specifications.distance || '',
//       serviceAvailability: specifications.serviceAvailability || [],
//       location: specifications.location || [],
//       settings: specifications.settings || [],
//       serviceFormat: specifications.serviceFormat || [],
//       groupRangeFrom: specifications.groupRange?.from || null,
//       groupRangeTo: specifications.groupRange?.to || null,
//       duration: specifications.duration || '',
//       customDurationHours: specifications.customDurationHours || null,
//       features: specifications.features || [],
//       expertise: specifications.expertise || [],
//       equipment: equipments.equipment || [],
//       trainingAids: equipments.trainingAids || [],
//       protectiveGear: equipments.protectiveGear || [],
//       accessories: equipments.accessories || [],
//       degree: profileInfo.degree || '',
//       fieldOfStudy: profileInfo.fieldOfStudy || '',
//       titles: profileInfo.titles || [],
//       tennisCertification: profileInfo.tennisCertification || '',
//       languages: profileInfo.languages || [],
//       basePrice: prices.basePrice || 0,
//       weekendPrice: prices.weekendPrice || 0,
//       additionalPersonPrice: prices.additionalPersonPrice || 0,
//       discounts: prices.discounts || {},
//       advancedOrderDiscount: prices.advancedOrderDiscount || {},
//       additionalFees: prices.additionalFees || {}
//     });

//     if (Array.isArray(data.selectedServices) && data.selectedServices.length > 0) {
//       const links = data.selectedServices.map(serviceId => ({
//         serviceId,
//         trainerId: trainer.id
//       }));
//       await ServiceTrainer.bulkCreate(links);
//     }

//     return res.status(201).json({
//       message: 'Trainer created successfully.',
//       trainer: {
//         id: trainer.id,
//         categoryId:    trainer.categoryId,     // ← here
//         subcategoryId: trainer.subcategoryId,  // ← and here
//         ...trainer.toJSON()
//       }
//     });

//   } catch (error) {
//     console.error('Error creating trainer:', error);
//     return res.status(500).json({ error: 'Failed to create trainer.' });
//   }
// };

// controllers/trainerController.js

// exports.createTrainer = async (req, res) => {
//   try {
//     // 1️⃣ Promote user to trainer
//     const userId = req.user.id;
//     const user   = await User.findByPk(userId);
//     if (!user) return res.status(404).json({ error: 'User not found.' });
//     await user.update({ role: 'trainer' });

//     // 2️⃣ Pull apart the payload
//     const {
//       type,
//       individualData = {},
//       selectedCategoryId,
//       selectedSubcategoryIds = [],
//       selectedServices = [],    // [32, 34] etc
//       images = [],              // array of base64 strings
//       mainImageIndex = 0,
//       serviceProviderSpecifications = {},
//       serviceProviderEquipments     = {},
//       servicePrices                 = {},
//       serviceProfileInformation     = {}
//     } = req.body;

//     // 3️⃣ Persist each Base64 → disk
//     const savedImages = [];
//     for (let i = 0; i < images.length; i++) {
//       try {
//         const url = saveBase64Image(images[i], userId, i);
//         savedImages.push({ url, order: i });
//       } catch (err) {
//         console.error(`Failed to save image #${i}:`, err);
//       }
//     }
//     const avatar = savedImages[mainImageIndex]?.url || '';

//     // 4️⃣ Simple experience→years mapping
//     const expMap = { '0–2 years':1, '3–5 years':4, '6–10 years':7, '10+ years':11 };
//     const yearsOfExperience = expMap[serviceProviderSpecifications.experience] || 0;

//     // 5️⃣ Prevent dupes
//     if (await Trainer.findOne({ where:{ userId } })) {
//       return res.status(400).json({ error:'A trainer already exists for this user.' });
//     }

//     // 6️⃣ Spin up the Trainer row
//     const trainer = await Trainer.create({
//       userId,
//       name:    (user.name||'').split(' ')[0] || 'Unknown',
//       surname: (user.name||'').split(' ').slice(1).join(' ') || 'Unknown',
//       type:    type==='individual' ? 'Individual' : 'Business',
//       avatar,
//       // you can pull highlights etc from req.body if you like:
//       highlights: [],
//       description: serviceProfileInformation.description || '',
//       userRating: 0,
//       backgroundCheck: '',
//       specialization:    serviceProviderSpecifications.features?.[0] || 'General',
//       level:             'Pro',
//       hourlyRate:        servicePrices.basePrice || 0,
//       categoryId:        selectedCategoryId,
//       subcategoryId:     selectedSubcategoryIds[0] || null,
//       gender:            'Male',
//       skills:            [],
//       yearsOfExperience,
//       certification:     serviceProviderSpecifications.certificationStatus || '',
//       ageGroup:          serviceProviderSpecifications.ageGroup || [],
//       ssn:               individualData.ssn || null,
//       typeOfServiceProvider: serviceProviderSpecifications.typeOfServiceProvider || '',
//       certificationStatus:   serviceProviderSpecifications.certificationStatus || '',
//       providerCategory:      serviceProviderSpecifications.providerCategory || '',
//       availability:          serviceProviderSpecifications.availability || '',
//       style:                 serviceProviderSpecifications.style || '',
//       distance:              serviceProviderSpecifications.distance || '',
//       serviceAvailability:   serviceProviderSpecifications.serviceAvailability || [],
//       location:              serviceProviderSpecifications.location || [],
//       settings:              serviceProviderSpecifications.settings || [],
//       serviceFormat:         serviceProviderSpecifications.serviceFormat || [],
//       groupRangeFrom:        serviceProviderSpecifications.groupRange?.from || null,
//       groupRangeTo:          serviceProviderSpecifications.groupRange?.to   || null,
//       duration:              serviceProviderSpecifications.duration || '',
//       customDurationHours:   serviceProviderSpecifications.customDurationHours || null,
//       features:              serviceProviderSpecifications.features || [],
//       expertise:             serviceProviderSpecifications.expertise || [],
//       equipment:             serviceProviderEquipments.equipment || [],
//       trainingAids:          serviceProviderEquipments.trainingAids || [],
//       protectiveGear:        serviceProviderEquipments.protectiveGear || [],
//       accessories:           serviceProviderEquipments.accessories || [],
//       degree:                serviceProfileInformation.degree || '',
//       fieldOfStudy:          serviceProfileInformation.fieldOfStudy || '',
//       titles:                serviceProfileInformation.titles || [],
//       tennisCertification:   serviceProfileInformation.tennisCertification || '',
//       languages:             serviceProfileInformation.languages || [],
//       basePrice:             servicePrices.basePrice || 0,
//       weekendPrice:          servicePrices.weekendPrice || 0,
//       additionalPersonPrice: servicePrices.additionalPersonPrice || 0,
//       discounts:             servicePrices.discounts || {},
//       advancedOrderDiscount: servicePrices.advancedOrderDiscount || {},
//       additionalFees:        servicePrices.additionalFees || {}
//     });

//     // 7️⃣ Link trainer ↔ services
//     if (selectedServices.length > 0) {
//       // a) pivot table
//       await ServiceTrainer.bulkCreate(
//         selectedServices.map(serviceId => ({ serviceId, trainerId: trainer.id }))
//       );

//       // b) for each service, upsert its details.serviceImage = [ ...saved URLs ]
//       const urls = savedImages.map(img => img.url);
//       await Promise.all(
//         selectedServices.map(async serviceId => {
//           const [details, created] = await ServiceDetails.findOrCreate({
//             where: { serviceId },
//             defaults: {
//               serviceId,
//               fullDescription:  '',
//               highlights:       [],
//               whatsIncluded:    [],
//               whatsNotIncluded: [],
//               recommendations:  [],
//               whatsToBring:     [],
//               coachInfo:        '',
//               serviceImage:     urls
//             }
//           });
//           if (!created) {
//             details.serviceImage = urls;
//             await details.save();
//           }
//         })
//       );
//     }

//     // 8️⃣ All done
//     return res.status(201).json({
//       message: 'Trainer created successfully.',
//       trainer: trainer.toJSON()
//     });

//   } catch (error) {
//     console.error('Error creating trainer:', error);
//     return res.status(500).json({ error:'Failed to create trainer.' });
//   }
// };


// controllers/trainerController.js


// controllers/trainerController.js



exports.createTrainer = async (req, res) => {
  try {
    // 1️⃣ Promote user to trainer
    const userId = req.user.id;
    const user   = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    await user.update({ role: 'trainer' });

    // 2️⃣ Destructure payload
    const {
      type                          = 'individual',
      individualData                = {},
      selectedCategoryId,
      selectedSubcategoryIds        = [],
      selectedServices              = [],  // [serviceId or { id, images, equipment, ... }]
      images                        = [],  // top-level base64 images
      mainImageIndex                = 0,
      serviceProviderSpecifications = {},
      serviceProviderEquipments     = {},
      servicePrices                 = {},
      serviceProfileInformation     = {},
      highlights                    = []
    } = req.body;

    // 3️⃣ Save images → avatar fallback
    const savedAvatars = images.map((b64, i) =>
      saveBase64Image(b64, `${userId}_avatar`, i)
    );
    const avatar = serviceProfileInformation.avatarUrl
                 || savedAvatars[mainImageIndex]
                 || '';


    const trainerDescription = serviceProfileInformation.trainerDescription || '';


    // 4️⃣ Prevent duplicate trainer
    if (await Trainer.findOne({ where: { userId } })) {
      return res.status(400).json({ error: 'Trainer already exists for this user.' });
    }

    // 5️⃣ Map experience string → integer
    const yearsMap = {
      '0–2 years': 1,
      '3–5 years': 4,
      '6–10 years': 7,
      '10+ years': 11,
      '11–15 years': 13
    };
    const yearsOfExperience = yearsMap[serviceProviderSpecifications.experience] || 0;

    // 6️⃣ Create the Trainer row, including equipment fields
    const trainer = await Trainer.create({
      userId,
      name:    (user.name||'').split(' ')[0] || 'Unknown',
      surname: (user.name||'').split(' ').slice(1).join(' ') || 'Unknown',
      type:    type === 'individual' ? 'Individual' : 'Business',
      avatar,
      highlights,
      trainerDescription,
      description:           serviceProfileInformation.description || '',
      specialization:        serviceProviderSpecifications.features?.[0] || 'General',
      level:                 'Pro',
      hourlyRate:            servicePrices.basePrice || 0,
      categoryId:            selectedCategoryId,
      subcategoryId:         selectedSubcategoryIds[0] || null,
      gender:                serviceProviderSpecifications.gender || 'Other',
      yearsOfExperience,
      certification:         serviceProviderSpecifications.certificationStatus || '',
      ssn:                   individualData.ssn || null,
      typeOfServiceProvider: serviceProviderSpecifications.typeOfServiceProvider || '',
      providerCategory:      serviceProviderSpecifications.providerCategory || '',
      availability:          serviceProviderSpecifications.availability || '',
      style:                 serviceProviderSpecifications.style || '',
      distance:              serviceProviderSpecifications.distance || '',
      serviceAvailability:   serviceProviderSpecifications.serviceAvailability || [],
      ageGroup:              serviceProviderSpecifications.ageGroup || [],
      location:              serviceProviderSpecifications.location || [],
      settings:              serviceProviderSpecifications.settings || [],
      serviceFormat:         serviceProviderSpecifications.serviceFormat || [],
      groupRangeFrom:        serviceProviderSpecifications.groupRange?.from || null,
      groupRangeTo:          serviceProviderSpecifications.groupRange?.to   || null,
      duration:              serviceProviderSpecifications.duration || '',
      customDurationHours:   serviceProviderSpecifications.customDurationHours || null,
      features:              serviceProviderSpecifications.features || [],
      expertise:             serviceProviderSpecifications.expertise || [],

      // ◀️ Persist these four columns
      equipment:      serviceProviderEquipments.equipment      || [],
      trainingAids:   serviceProviderEquipments.trainingAids   || [],
      protectiveGear: serviceProviderEquipments.protectiveGear || [],
      accessories:    serviceProviderEquipments.accessories    || [],

      // Profile & pricing
      degree:                serviceProfileInformation.degree                || '',
      fieldOfStudy:          serviceProfileInformation.fieldOfStudy          || '',
      titles:                serviceProfileInformation.titles                || [],
      tennisCertification:   serviceProfileInformation.tennisCertification   || '',
      languages:             serviceProfileInformation.languages             || [],

      basePrice:             servicePrices.basePrice             || 0,
      weekendPrice:          servicePrices.weekendPrice          || 0,
      additionalPersonPrice: servicePrices.additionalPersonPrice || 0,
      discounts:             servicePrices.discounts             || {},
      advancedOrderDiscount: servicePrices.advancedOrderDiscount || {},
      additionalFees:        servicePrices.additionalFees        || {}
    });

    // 7️⃣ Link trainer ↔ services & upsert per-service details (optional)
    for (const item of selectedServices) {
      const serviceId = typeof item === 'number' ? item : item.id;
      if (!serviceId) continue;

      // save per-service images
      const imgs = Array.isArray(item.images) ? item.images : images;
      const urls = imgs.map((b64, idx) =>
        saveBase64Image(b64, `${userId}_${serviceId}`, idx)
      );
      const gear = item.equipment || {};

      // pivot upsert
      const [pivot, created] = await ServiceTrainer.findOrCreate({
        where: { serviceId, trainerId: trainer.id },
        defaults: { serviceImages: urls, equipment: gear }
      });
      if (!created) {
        pivot.serviceImages = urls;
        pivot.equipment     = gear;
        await pivot.save();
      }

      // shared details upsert
      const [details, detailCreated] = await ServiceDetails.findOrCreate({
        where: { serviceId },
        defaults: {
          serviceId,
          fullDescription:  serviceProfileInformation.fullDescription || '',
          highlights:       serviceProfileInformation.highlights           || [],
          whatsIncluded:    serviceProfileInformation.whatsIncluded        || [],
          whatsNotIncluded: serviceProfileInformation.whatsNotIncluded     || [],
          recommendations:  serviceProfileInformation.recommendations       || [],
          coachInfo:        serviceProfileInformation.coachInfo            || '',
          serviceImage:     urls
        }
      });
      if (!detailCreated) {
        details.serviceImage = urls;
        await details.save();
      }
    }

    // 8️⃣ Done
    return res.status(201).json({
      message: 'Trainer created successfully.',
      trainer: trainer.toJSON()
    });

  } catch (err) {
    console.error('createTrainer error:', err);
    return res.status(500).json({ error: 'Failed to create trainer.' });
  }
};


// Add this helper at the top of your controller file:
function isBase64DataUri(str) {
  return (
    typeof str === 'string' &&
    str.startsWith('data:image') &&
    str.includes(';base64,')
  );
}

// models/Trainer/Trainer.js, models/Services/ServiceDetails.js etc. are assumed to be correctly defined
// const saveBase64Image = require('../../util/saveBase64Image'); // Assumed to be correct

// Helper to detect a base64 data URI (already in your code)
function isBase64DataUri(str) {
  return (
    typeof str === 'string' &&
    str.startsWith('data:image') &&
    str.includes(';base64,')
  );
}

exports.updateTrainerFull = async (req, res) => {
  try {
    const trainerId = parseInt(req.params.id, 10);
    const existingTrainer = await Trainer.findByPk(trainerId); // Changed variable name for clarity
    if (!existingTrainer) {
      return res.status(404).json({ error: 'Trainer not found.' });
    }

    const {
      type = existingTrainer.type,
      individualData = {}, // Assuming ssn might be in here
      selectedCategoryId = existingTrainer.categoryId,
      selectedSubcategoryIds = [existingTrainer.subcategoryId],
      selectedServices = [], // Expected: Array of objects { id, images: [...], equipment: {}, fullDescription, ... }
      images = [], // Top-level images, typically for trainer avatar
      mainImageIndex = 0,
      serviceProviderSpecifications = {},
      serviceProviderEquipments = {},
      servicePrices = {},
      serviceProfileInformation = {},
      highlights = existingTrainer.highlights || []
    } = req.body;

    // --- Handle Avatar Update ---
    let avatarToSave = existingTrainer.avatar; // Use 'existingTrainer'
    if (serviceProfileInformation.avatarUrl) { // Explicit avatar URL from profile info takes precedence
        avatarToSave = serviceProfileInformation.avatarUrl;
    } else if (Array.isArray(images) && images.length > 0) {
      const primaryAvatarImage = images[mainImageIndex];
      if (primaryAvatarImage) {
        if (isBase64DataUri(primaryAvatarImage)) {
          try {
            // saveBase64Image should return a relative path, e.g., /uploads/avatar-image.jpg
            avatarToSave = saveBase64Image(primaryAvatarImage, `${existingTrainer.userId}_avatar_main`, 0);
          } catch (saveError) {
            console.error(`Error saving main avatar image: ${saveError.message}`);
            // Decide if you want to halt or continue with the old avatar
          }
        } else {
          avatarToSave = primaryAvatarImage; // Assume it's already a URL/path
        }
      }
    }
    // If images array was empty and no avatarUrl, avatarToSave remains existingTrainer.avatar

    // --- Map Experience String to Integer ---
    const yearsMap = {
      '0–2 years': 1, '3–5 years': 4, '6–10 years': 7,
      '10+ years': 11, '11–15 years': 13, '16+ years': 16 // Added 16+ years
    };
    const yearsOfExperience = yearsMap[serviceProviderSpecifications.experience] || existingTrainer.yearsOfExperience;

    // --- Update Trainer's Own Columns ---
    await existingTrainer.update({
      name: req.body.name || (req.user && req.user.name ? req.user.name.split(' ')[0] : existingTrainer.name),
      surname: req.body.surname || (req.user && req.user.name ? req.user.name.split(' ').slice(1).join(' ') : existingTrainer.surname),
      type: type === 'individual' ? 'Individual' : (type === 'business' ? 'Business' : existingTrainer.type),
      avatar: avatarToSave,
      highlights: Array.isArray(highlights) ? highlights : existingTrainer.highlights, // Ensure it's an array
      trainerDescription: serviceProfileInformation.trainerDescription !== undefined ? serviceProfileInformation.trainerDescription : existingTrainer.trainerDescription,
      description: serviceProfileInformation.description !== undefined ? serviceProfileInformation.description : existingTrainer.description,
      specialization: (serviceProviderSpecifications.features && serviceProviderSpecifications.features.length > 0 ? serviceProviderSpecifications.features[0] : existingTrainer.specialization),
      level: serviceProviderSpecifications.typeOfServiceProvider || existingTrainer.level, // Assuming level means typeOfServiceProvider
      hourlyRate: servicePrices.basePrice !== undefined ? servicePrices.basePrice : existingTrainer.hourlyRate,
      categoryId: selectedCategoryId,
      subcategoryId: Array.isArray(selectedSubcategoryIds) && selectedSubcategoryIds.length > 0 ? selectedSubcategoryIds[0] : existingTrainer.subcategoryId,
      gender: serviceProviderSpecifications.gender || existingTrainer.gender,
      yearsOfExperience,
      certification: serviceProviderSpecifications.certificationStatus !== undefined ? serviceProviderSpecifications.certificationStatus : existingTrainer.certification, // From trainer table
      ssn: individualData.ssn !== undefined ? individualData.ssn : existingTrainer.ssn,
      typeOfServiceProvider: serviceProviderSpecifications.typeOfServiceProvider !== undefined ? serviceProviderSpecifications.typeOfServiceProvider : existingTrainer.typeOfServiceProvider,
      certificationStatus: serviceProviderSpecifications.certificationStatus !== undefined ? serviceProviderSpecifications.certificationStatus : existingTrainer.certificationStatus, // From specifications
      providerCategory: serviceProviderSpecifications.providerCategory !== undefined ? serviceProviderSpecifications.providerCategory : existingTrainer.providerCategory,
      availability: serviceProviderSpecifications.availability !== undefined ? serviceProviderSpecifications.availability : existingTrainer.availability,
      style: serviceProviderSpecifications.style !== undefined ? serviceProviderSpecifications.style : existingTrainer.style,
      distance: serviceProviderSpecifications.distance !== undefined ? serviceProviderSpecifications.distance : existingTrainer.distance,
      serviceAvailability: Array.isArray(serviceProviderSpecifications.serviceAvailability) ? serviceProviderSpecifications.serviceAvailability : existingTrainer.serviceAvailability,
      ageGroup: Array.isArray(serviceProviderSpecifications.ageGroup) ? serviceProviderSpecifications.ageGroup : existingTrainer.ageGroup,
      location: Array.isArray(serviceProviderSpecifications.location) ? serviceProviderSpecifications.location : existingTrainer.location,
      settings: Array.isArray(serviceProviderSpecifications.settings) ? serviceProviderSpecifications.settings : existingTrainer.settings,
      serviceFormat: Array.isArray(serviceProviderSpecifications.serviceFormat) ? serviceProviderSpecifications.serviceFormat : existingTrainer.serviceFormat,
      groupRangeFrom: serviceProviderSpecifications.groupRange && serviceProviderSpecifications.groupRange.from !== undefined ? serviceProviderSpecifications.groupRange.from : existingTrainer.groupRangeFrom,
      groupRangeTo: serviceProviderSpecifications.groupRange && serviceProviderSpecifications.groupRange.to !== undefined ? serviceProviderSpecifications.groupRange.to : existingTrainer.groupRangeTo,
      duration: serviceProviderSpecifications.duration !== undefined ? serviceProviderSpecifications.duration : existingTrainer.duration,
      customDurationHours: serviceProviderSpecifications.customDurationHours !== undefined ? serviceProviderSpecifications.customDurationHours : existingTrainer.customDurationHours,
      features: Array.isArray(serviceProviderSpecifications.features) ? serviceProviderSpecifications.features : existingTrainer.features,
      expertise: Array.isArray(req.body.selectedServices) ? req.body.selectedServices.map(s => s.id || s) : existingTrainer.expertise, // Assuming expertise refers to service IDs

      equipment: Array.isArray(serviceProviderEquipments.equipment) ? serviceProviderEquipments.equipment : existingTrainer.equipment,
      trainingAids: Array.isArray(serviceProviderEquipments.trainingAids) ? serviceProviderEquipments.trainingAids : existingTrainer.trainingAids,
      protectiveGear: Array.isArray(serviceProviderEquipments.protectiveGear) ? serviceProviderEquipments.protectiveGear : existingTrainer.protectiveGear,
      accessories: Array.isArray(serviceProviderEquipments.accessories) ? serviceProviderEquipments.accessories : existingTrainer.accessories,

      degree: serviceProfileInformation.degree !== undefined ? serviceProfileInformation.degree : existingTrainer.degree,
      fieldOfStudy: serviceProfileInformation.fieldOfStudy !== undefined ? serviceProfileInformation.fieldOfStudy : existingTrainer.fieldOfStudy,
      titles: Array.isArray(serviceProfileInformation.titles) ? serviceProfileInformation.titles : existingTrainer.titles,
      tennisCertification: serviceProfileInformation.tennisCertification !== undefined ? serviceProfileInformation.tennisCertification : existingTrainer.tennisCertification,
      languages: Array.isArray(serviceProfileInformation.languages) ? serviceProfileInformation.languages : existingTrainer.languages,

      basePrice: servicePrices.basePrice !== undefined ? servicePrices.basePrice : existingTrainer.basePrice,
      weekendPrice: servicePrices.weekendPrice !== undefined ? servicePrices.weekendPrice : existingTrainer.weekendPrice,
      additionalPersonPrice: servicePrices.additionalPersonPrice !== undefined ? servicePrices.additionalPersonPrice : existingTrainer.additionalPersonPrice,
      discounts: typeof servicePrices.discounts === 'object' ? servicePrices.discounts : existingTrainer.discounts,
      advancedOrderDiscount: typeof servicePrices.advancedOrderDiscount === 'object' ? servicePrices.advancedOrderDiscount : existingTrainer.advancedOrderDiscount,
      additionalFees: typeof servicePrices.additionalFees === 'object' ? servicePrices.additionalFees : existingTrainer.additionalFees,
    });

    // --- Synchronize Selected Services (ServiceTrainer pivot & ServiceDetails) ---
    const newServiceIds = selectedServices
      .map(item => (typeof item === 'object' && item !== null ? item.id : item)) // Get ID if object, else assume it's ID
      .filter(id => !!id);

    const existingPivots = await ServiceTrainer.findAll({ where: { trainerId } });
    const existingServiceIdsInPivot = existingPivots.map(p => p.serviceId);

    const servicesToRemoveFromPivot = existingServiceIdsInPivot.filter(id => !newServiceIds.includes(id));
    if (servicesToRemoveFromPivot.length > 0) {
      await ServiceTrainer.destroy({ where: { trainerId, serviceId: servicesToRemoveFromPivot } });
      // Optionally, decide if you want to delete ServiceDetails if no other trainer uses them.
      // For now, we'll leave ServiceDetails intact as they might be shared or referenced elsewhere.
    }

    for (const serviceItem of selectedServices) {
      const serviceId = typeof serviceItem === 'object' && serviceItem !== null ? serviceItem.id : serviceItem;
      if (!serviceId) {
        console.warn('Skipping a service item due to missing ID:', serviceItem);
        continue;
      }

      let processedImageUrlsForDb = [];
      const serviceImagesFromPayload = typeof serviceItem === 'object' && serviceItem !== null ? serviceItem.images : null;

      if (Array.isArray(serviceImagesFromPayload)) {
        console.log(`Processing images for serviceId ${serviceId}:`, serviceImagesFromPayload);
        for (const [idx, imgStr] of serviceImagesFromPayload.entries()) {
          if (isBase64DataUri(imgStr)) {
            try {
              // saveBase64Image MUST return a relative path like '/uploads/filename.ext'
              const savedPath = saveBase64Image(imgStr, `${existingTrainer.userId}_service_${serviceId}`, idx);
              if (savedPath) {
                processedImageUrlsForDb.push(savedPath);
              } else {
                console.warn(`saveBase64Image returned null/empty for service ${serviceId}, image index ${idx}`);
              }
            } catch (saveError) {
              console.error(`Error saving image for service ${serviceId}, index ${idx}: ${saveError.message}`);
              // Optionally, add a placeholder or skip this image
            }
          } else if (typeof imgStr === 'string' && imgStr.trim() !== '' && !imgStr.startsWith('assets/placeholder')) {
            // Assume it's an existing URL/path, ensure it's relative if it's from our own server
            if (imgStr.startsWith('http://localhost:3000')) { // Or your config.serverUrl
                 try {
                    const url = new URL(imgStr);
                    processedImageUrlsForDb.push(url.pathname); // Store as relative path e.g. /uploads/...
                 } catch (e) {
                    processedImageUrlsForDb.push(imgStr); // Fallback
                 }
            } else {
                 processedImageUrlsForDb.push(imgStr); // Already relative or external URL
            }
          }
        }
        console.log(`Processed images for DB for serviceId ${serviceId}:`, processedImageUrlsForDb);
      } else {
        // If images array is not provided in payload for this service, keep existing ones from pivot or details
        const existingPivot = existingPivots.find(p => p.serviceId === serviceId);
        if (existingPivot && Array.isArray(existingPivot.serviceImages)) {
          processedImageUrlsForDb = existingPivot.serviceImages;
        } else {
          const existingDetail = await ServiceDetails.findOne({ where: { serviceId } });
          if (existingDetail && Array.isArray(existingDetail.serviceImage)) {
            processedImageUrlsForDb = existingDetail.serviceImage;
          }
        }
         console.log(`No new images in payload for serviceId ${serviceId}. Using existing (if any):`, processedImageUrlsForDb);
      }
      
      // Ensure no null or undefined values in the array before saving
      processedImageUrlsForDb = processedImageUrlsForDb.filter(url => url && typeof url === 'string');


      // Upsert ServiceTrainer (pivot table link)
      const serviceEquipment = (typeof serviceItem === 'object' && serviceItem.equipment) ? serviceItem.equipment : {};
      const [pivot, wasPivotCreated] = await ServiceTrainer.findOrCreate({
        where: { serviceId, trainerId },
        defaults: { serviceImages: processedImageUrlsForDb, equipment: serviceEquipment }
      });
      if (!wasPivotCreated) {
        pivot.serviceImages = processedImageUrlsForDb;
        pivot.equipment = serviceEquipment; // Always update equipment if provided
        await pivot.save();
      }

      // Upsert ServiceDetails (shared details for the service)
      // Extract details from serviceItem if it's an object, otherwise use general serviceProfileInformation or existing
      const fullDescription = (typeof serviceItem === 'object' && serviceItem.fullDescription !== undefined) ? serviceItem.fullDescription : serviceProfileInformation.fullDescription;
      const itemHighlights = (typeof serviceItem === 'object' && serviceItem.highlights !== undefined) ? serviceItem.highlights : serviceProfileInformation.highlights;
      const whatsIncluded = (typeof serviceItem === 'object' && serviceItem.whatsIncluded !== undefined) ? serviceItem.whatsIncluded : serviceProfileInformation.whatsIncluded;
      const whatsNotIncluded = (typeof serviceItem === 'object' && serviceItem.whatsNotIncluded !== undefined) ? serviceItem.whatsNotIncluded : serviceProfileInformation.whatsNotIncluded;
      const recommendations = (typeof serviceItem === 'object' && serviceItem.recommendations !== undefined) ? serviceItem.recommendations : serviceProfileInformation.recommendations;
      const coachInfo = (typeof serviceItem === 'object' && serviceItem.coachInfo !== undefined) ? serviceItem.coachInfo : serviceProfileInformation.coachInfo;

      const [detail, wasDetailCreated] = await ServiceDetails.findOrCreate({
        where: { serviceId },
        defaults: {
          serviceId,
          fullDescription: fullDescription || '',
          highlights: Array.isArray(itemHighlights) ? itemHighlights : [],
          whatsIncluded: Array.isArray(whatsIncluded) ? whatsIncluded : [],
          whatsNotIncluded: Array.isArray(whatsNotIncluded) ? whatsNotIncluded : [],
          recommendations: Array.isArray(recommendations) ? recommendations : [],
          coachInfo: coachInfo || '',
          serviceImage: processedImageUrlsForDb // Ensure this service's images are saved here too
        }
      });
      if (!wasDetailCreated) {
        detail.serviceImage = processedImageUrlsForDb; // Critical: Update serviceImage here
        if (fullDescription !== undefined) detail.fullDescription = fullDescription;
        if (itemHighlights !== undefined) detail.highlights = Array.isArray(itemHighlights) ? itemHighlights : detail.highlights;
        if (whatsIncluded !== undefined) detail.whatsIncluded = Array.isArray(whatsIncluded) ? whatsIncluded : detail.whatsIncluded;
        if (whatsNotIncluded !== undefined) detail.whatsNotIncluded = Array.isArray(whatsNotIncluded) ? whatsNotIncluded : detail.whatsNotIncluded;
        if (recommendations !== undefined) detail.recommendations = Array.isArray(recommendations) ? recommendations : detail.recommendations;
        if (coachInfo !== undefined) detail.coachInfo = coachInfo;
        await detail.save();
      }
    }

    const finalTrainerData = await Trainer.findByPk(trainerId, {
        include: [
             { model: Category, attributes: ['id', 'name'] },
             { model: SubCategory, attributes: ['id', 'name'], include: [{ model: Category, attributes: ['id', 'name'] }] },
             {
               model: Service,
               attributes: ['id', 'name', 'description', 'image', 'duration', 'hourlyRate', 'level', 'type', 'subCategoryId'],
               through: { attributes: ['serviceImages', 'equipment'] }, // Include from ServiceTrainer
               include: [
                 { model: ServiceDetails, attributes: ['serviceImage', 'fullDescription', 'highlights', 'whatsIncluded', 'whatsNotIncluded', 'recommendations', 'coachInfo'] },
                 { model: SubCategory, attributes: ['id', 'name'], include: [{ model: Category, attributes: ['id', 'name'] }] }
               ]
             }
        ]
    });


    return res.status(200).json({
      message: 'Trainer and associated service details updated successfully.',
      trainer: finalTrainerData // Send back the fully updated trainer data
    });

  } catch (err) {
    console.error('updateTrainerFull error:', err, err.stack);
    return res.status(500).json({ error: 'Failed to fully update trainer.', details: err.message });
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
      trainerDescription: updates.trainerDescription,

      groupRangeFrom: updates.groupRange?.from || null,
      groupRangeTo: updates.groupRange?.to || null
    });

    res.json({ message: 'Trainer updated successfully', trainer });
  } catch (error) {
    console.error('Error updating trainer:', error);
    res.status(500).json({ error: 'Failed to update trainer' });
  }
};

exports.updateTrainerLanguages = async (req, res) => {
  try {
    const { id } = req.params;
    const { languages = [] } = req.body;          // expects array of strings

    const trainer = await Trainer.findByPk(id);
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });

    await trainer.update({ languages });
    res.json({ message: 'Languages updated', trainer });
  } catch (err) {
    console.error('updateTrainerLanguages:', err);
    res.status(500).json({ error: 'Server error updating languages' });
  }
};

/**
 * PATCH /api/trainers/:id/field-of-study
 * { fieldOfStudy: "Kinesiology" }
 */
exports.updateTrainerFieldOfStudy = async (req, res) => {
  try {
    const { id } = req.params;
    const { fieldOfStudy = '' } = req.body;

    const trainer = await Trainer.findByPk(id);
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });

    await trainer.update({ fieldOfStudy });
    res.json({ message: 'Field of study updated', trainer });
  } catch (err) {
    console.error('updateTrainerFieldOfStudy:', err);
    res.status(500).json({ error: 'Server error updating field of study' });
  }
};

/**
 * PATCH /api/trainers/:id/degree
 * { degree: "Bachelor's Degree" }
 */
exports.updateTrainerDegree = async (req, res) => {
  try {
    const { id } = req.params;
    const { degree = '' } = req.body;

    const trainer = await Trainer.findByPk(id);
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });

    await trainer.update({ degree });
    res.json({ message: 'Degree updated', trainer });
  } catch (err) {
    console.error('updateTrainerDegree:', err);
    res.status(500).json({ error: 'Server error updating degree' });
  }
};

/**
 * PATCH /api/trainers/:id/tennis-cert
 * { tennisCertification: "USPTA" }
 */
exports.updateTrainerTennisCert = async (req, res) => {
  try {
    const { id } = req.params;
    const { tennisCertification = '' } = req.body;

    const trainer = await Trainer.findByPk(id);
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });

    await trainer.update({ tennisCertification });
    res.json({ message: 'Tennis certification updated', trainer });
  } catch (err) {
    console.error('updateTrainerTennisCert:', err);
    res.status(500).json({ error: 'Server error updating tennis certification' });
  }
};

/**
 * PATCH /api/trainers/:id/distance
 * { distance: 25 }   // kilometres or miles – your choice
 */
exports.updateTrainerDistance = async (req, res) => {
  try {
    const { id } = req.params;
    let   { distance } = req.body;

    distance = Number(distance);
    if (Number.isNaN(distance) || distance < 0)
      return res.status(400).json({ error: 'Distance must be a positive number' });

    const trainer = await Trainer.findByPk(id);
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });

    await trainer.update({ distance });
    res.json({ message: 'Distance updated', trainer });
  } catch (err) {
    console.error('updateTrainerDistance:', err);
    res.status(500).json({ error: 'Server error updating distance' });
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


// controllers/trainerController.js

exports.getTrainerByUserId = async (req, res) => {
  try {
    const trainer = await Trainer.findOne({
      where: { userId: req.params.userId },
      include: [
        // 1) Trainer → Category (for categoryName)
        { model: Category, attributes: ['id', 'name'] },
        // 2) Trainer → SubCategory (for subcategoryName)
        { model: SubCategory, attributes: ['id', 'name'], include: [{ model: Category, attributes: ['id', 'name'] }] },
        // 3) Trainer → Service (through ServiceTrainer), and for each Service include its ServiceDetails and its own SubCategory→Category
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
            'type',
            'subCategoryId'
          ],
          through: { attributes: [] }, // omit pivot columns
          include: [
            {
              model: ServiceDetails,
              attributes: [
                'serviceImage',
                'fullDescription',
                'highlights',
                'whatsIncluded',
                'whatsNotIncluded',
                'recommendations',
                'coachInfo'
              ]
            },
            {
              model: SubCategory,
              attributes: ['id', 'name'],
              include: [{ model: Category, attributes: ['id', 'name'] }]
            }
          ]
        }
      ]
    });

    if (!trainer) {
      return res.status(404).json({ error: 'Trainer not found for this user' });
    }

    // Convert to plain JSON object
    const t = trainer.get({ plain: true });

    // Build a structured "services" array with nested details
    const services = (t.Services || []).map((service) => ({
      serviceId:          service.id,
      name:               service.name,
      description:        service.description,
      image:              service.image,
      duration:           service.duration,
      hourlyRate:         service.hourlyRate,
      level:              service.level,
      type:               service.type,
      subCategoryId:      service.subCategoryId,
      subCategoryName:    service.SubCategory?.name || null,
      categoryId:         service.SubCategory?.Category?.id || null,
      categoryName:       service.SubCategory?.Category?.name || null,
      // pull service-level gallery from ServiceDetails
      serviceImage:       service.ServiceDetail?.serviceImage || [],
      fullDescription:    service.ServiceDetail?.fullDescription || '',
      highlights:         service.ServiceDetail?.highlights || [],
      whatsIncluded:      service.ServiceDetail?.whatsIncluded || [],
      whatsNotIncluded:   service.ServiceDetail?.whatsNotIncluded || [],
      recommendations:    service.ServiceDetail?.recommendations || [],
      coachInfo:          service.ServiceDetail?.coachInfo || ''
    }));

    return res.status(200).json({
      trainerId:              t.id,
      userId:                 t.userId,
      categoryId:             t.categoryId,
      subcategoryId:          t.subcategoryId,
      categoryName:           t.Category?.name || null,
      subcategoryName:        t.SubCategory?.name || null,

      style:                  t.style,
      availability:           t.availability,
      typeOfServiceProvider:  t.typeOfServiceProvider,
      providerCategory:       t.providerCategory,
      certificationStatus:    t.certificationStatus,

      // core fields
      name:                   t.name,
      surname:                t.surname,
      description:            t.description,
      trainerDescription:     t.trainerDescription,

      avatar:                 t.avatar,
      userRating:             t.userRating,
      specialization:         t.specialization,
      level:                  t.level,
      hourlyRate:             t.hourlyRate,
      gender:                 t.gender,
      distance:               t.distance,

      yearsOfExperience:      t.yearsOfExperience,
      ageGroup:               t.ageGroup,
      serviceAvailability:    t.serviceAvailability,
      location:               t.location,
      settings:               t.settings,
      serviceFormat:          t.serviceFormat,
      features:               t.features,
      expertise:              t.expertise,

      // serviceProviderEquipments now included:
      serviceProviderEquipments: {
        equipment:      t.equipment || [],
        trainingAids:   t.trainingAids || [],
        protectiveGear: t.protectiveGear || [],
        accessories:    t.accessories || []
      },

      // profile & pricing
      degrees:                t.degree,
      fieldOfStudy:           t.fieldOfStudy,
      tennisCertification:    t.tennisCertification,
      languages:              t.languages,
      highlights:             t.highlights,
      groupRangeFrom:         t.groupRangeFrom,
      groupRangeTo:           t.groupRangeTo,
      duration:               t.duration,
      customDurationHours:    t.customDurationHours,
      basePrice:              t.basePrice,
      weekendPrice:           t.weekendPrice,
      additionalPersonPrice:  t.additionalPersonPrice,
      discounts:              t.discounts,
      advancedOrderDiscount:  t.advancedOrderDiscount,
      additionalFees:         t.additionalFees,

      // newly added services array
      services,

      createdAt:              t.createdAt,
      updatedAt:              t.updatedAt
    });

  } catch (error) {
    console.error('Error fetching trainer by userId:', error);
    return res.status(500).json({ error: 'Server error while fetching trainer' });
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
      categoryId:    trainer.categoryId,     // 🆕
      subcategoryId: trainer.subcategoryId,  // 🆕
      name: trainer.name,
      surname: trainer.surname,
      
    });
  } catch (error) {
    console.error('Error in findTrainerByUserId:', error);
    res.status(500).json({ error: 'Internal server error while fetching trainer by userId' });
  }
};
