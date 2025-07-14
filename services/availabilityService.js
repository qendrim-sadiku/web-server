// services/availabilityService.js

const { Op } = require('sequelize');
const Booking = require('../models/Bookings/Booking');
const BookingDate = require('../models/Bookings/BookingDate');
const AvailabilitySlot = require('../models/Trainer/AvailabilitySlot');

/**
 * Helper – convert '09:30' → 930 for numeric comparisons.
 */
const toNum = (t) => {
  if (!t || !t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 100 + m;
};

/**
 * The single source of truth for fetching a trainer's available slots for a given day.
 * This function is designed to be called from any controller.
 * @param {number} trainerId - The ID of the trainer.
 * @param {string} date - The date in 'YYYY-MM-DD' format.
 * @returns {Promise<Array<object>>} - A promise that resolves to an array of available slot objects.
 */
exports.getAvailableSlotsForDay = async (trainerId, date) => {
  try {
    // 1️⃣ Fetch all raw data for the day
    // Get all potential 1-hour work slots defined by the trainer
    const workSlots = await AvailabilitySlot.findAll({
      where: { trainerId, date, isBreak: false },
      attributes: ['startTime', 'endTime'], // Only get what you need
      raw: true,
      order: [['startTime', 'ASC']],
    });

    // Get all breaks defined for that day
    const breakSlots = await AvailabilitySlot.findAll({
      where: { trainerId, date, isBreak: true },
      attributes: ['startTime', 'endTime'],
      raw: true,
    });

    // Get all active bookings for that day
    const bookings = await BookingDate.findAll({
      where: { date },
      include: [{ model: Booking, attributes: [], where: { trainerId, status: 'active' } }],
      attributes: ['startTime', 'endTime'],
      raw: true,
    });

    // 2️⃣ Identify all "blocked" time intervals (breaks and bookings)
    const blockers = [...breakSlots, ...bookings];

    // 3️⃣ Filter work slots against the blockers
    // A work slot is only available if it does NOT overlap with any blocker.
    const availableSlots = workSlots.filter((slot) => {
      const slotStartNum = toNum(slot.startTime);
      const slotEndNum = toNum(slot.endTime);

      const isBlocked = blockers.some((blocker) => {
        const blockerStartNum = toNum(blocker.startTime);
        const blockerEndNum = toNum(blocker.endTime);
        // Standard overlap condition
        return slotStartNum < blockerEndNum && slotEndNum > blockerStartNum;
      });

      return !isBlocked; // Keep the slot only if it's not blocked
    });

    // Instead of res.json, we RETURN the data for the controller to use
    return availableSlots;

  } catch (err) {
    console.error(`Error in getAvailableSlotsForDay for trainer ${trainerId} on ${date}:`, err);
    // Throw the error so the calling controller can handle it with a 500 response
    throw new Error('Failed to calculate availability.');
  }
};