// controllers/availabilityController.js

const { Op } = require('sequelize');
const sequelize = require('../config/sequelize');
const Trainer = require('../models/Trainer/Trainer');
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
 * Helper - merge consecutive 1-hour slots into larger blocks.
 * e.g., [ {9-10}, {10-11} ] -> [ {9-11} ]
 */
const mergeSlots = (slots) => {
  if (!slots.length) return [];

  // Sort by start time to ensure correct merging order
  const sorted = [...slots].sort((a, b) => toNum(a.startTime) - toNum(b.startTime));

  const merged = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    // Merge if current slot starts exactly when the last one ended
    if (last.endTime === current.startTime) {
      last.endTime = current.endTime; // Extend the end time of the last slot
    } else {
      merged.push(current);
    }
  }
  return merged;
};




/* ────────────────────────────────────────────────────────────
    POST /api/trainers/:trainerId/availability
────────────────────────────────────────────────────────────── */
exports.upsertSlots = async (req, res) => {
  const t = await sequelize.transaction(); // Start a transaction

  try {
    const trainerId = Number(req.params.trainerId);

    /* 0️⃣ Ownership & Vacation Mode Check */
    const trainer = await Trainer.findByPk(trainerId, { transaction: t });
    if (!trainer) {
      await t.rollback();
      return res.status(404).json({ error: 'Trainer not found' });
    }
    if (req.user.role !== 'admin' && trainer.userId !== req.user.id) {
      await t.rollback();
      return res.status(403).json({ error: 'Not your trainer profile.' });
    }
    if (trainer.vacationMode) {
      await t.rollback();
      return res.status(423).json({ error: 'Calendar locked – vacation mode is ON.' });
    }

    /* 1️⃣ Unpack body */
    const {
      slots = [],
      settings = {},
      ignoreConflicts = false,
    } = req.body;

    if (!Array.isArray(slots) || slots.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'No slots supplied.' });
    }
    
    /* 2️⃣ Update Trainer Settings (Vacation Mode, Auto Accept) */
    if (settings && Object.keys(settings).length > 0) {
      await trainer.update({
        vacationMode: !!settings.vacationMode,
        autoAcceptServiceRequest: !!settings.autoAccept,
      }, { transaction: t });
    }

    /* 3️⃣ Normalize: Split long WORK blocks into 1-hour chunks. Breaks remain intact. */
    const toChunks = (row) => {
      if (row.isBreak) return [row]; // Keep breaks as they are
      const out = [];
      let [h, m] = row.startTime.split(':').map(Number);
      const [endH, endM] = row.endTime.split(':').map(Number);

      while (h * 60 + m < endH * 60 + endM) {
        const nextH = h + 1;
        out.push({
          ...row,
          startTime: `${String(h).padStart(2, '0')}:00`,
          endTime: `${String(nextH).padStart(2, '0')}:00`,
        });
        h = nextH;
      }
      return out;
    };
    const normalized = slots.flatMap(toChunks);

    /* 4️⃣ Detect Overlaps within the payload itself */
    const clashInside = (rows) => {
      const arr = [...rows].sort((a, b) => toNum(a.startTime) - toNum(b.startTime));
      for (let i = 1; i < arr.length; i++) {
        if (toNum(arr[i - 1].endTime) > toNum(arr[i].startTime)) return true;
      }
      return false;
    };

    const keyedByDateAndBreak = normalized.reduce((acc, r) => {
      const key = `${r.date}|${r.isBreak ? 1 : 0}`;
      (acc[key] || (acc[key] = [])).push(r);
      return acc;
    }, {});

    for (const group of Object.values(keyedByDateAndBreak)) {
      if (clashInside(group)) {
        await t.rollback();
        return res.status(400).json({ error: 'Overlapping slots in payload' });
      }
    }

    /* 5️⃣ Detect clashes vs. existing ACTIVE bookings */
    const datesToUpdate = [...new Set(normalized.map(s => s.date))];
    const bookingRows = await BookingDate.findAll({
      where: { date: { [Op.in]: datesToUpdate } },
      include: [{
        model: Booking,
        where: { trainerId, status: 'active' },
        attributes: [],
      }],
      raw: true, // No transaction needed for read-only query
    });

    const bookedMap = bookingRows.reduce((acc, b) => {
      (acc[b.date] || (acc[b.date] = [])).push({ s: toNum(b.startTime), e: toNum(b.endTime) });
      return acc;
    }, {});

    const conflicts = [];
    normalized.forEach((s) => {
      (bookedMap[s.date] || []).forEach((b) => {
        if (toNum(s.startTime) < b.e && toNum(s.endTime) > b.s) {
          conflicts.push({ slot: s });
        }
      });
    });

    if (conflicts.length && !ignoreConflicts) {
      await t.rollback();
      return res.status(409).json({ type: 'SCHEDULE_CONFLICT', conflicts });
    }

    /* 6️⃣ Store: Wipe all old slots for the affected dates, then bulk-insert new ones */
    await AvailabilitySlot.destroy({
      where: { trainerId, date: { [Op.in]: datesToUpdate } },
      transaction: t,
    });
    
    // Add trainerId FK to every slot before inserting
    normalized.forEach((r) => (r.trainerId = trainerId));
    await AvailabilitySlot.bulkCreate(normalized, { transaction: t });
    
    /* 7️⃣ Commit transaction and respond */
    await t.commit();
    res.status(200).json({ message: 'Availability updated', slots: normalized });

  } catch (err) {
    await t.rollback(); // Rollback on any error
    console.error('upsertSlots Error:', err);
    res.status(500).json({ error: 'Server error while saving availability' });
  }
};


/* ────────────────────────────────────────────────────────────
    GET /api/trainers/:trainerId/availability?date=YYYY-MM-DD
────────────────────────────────────────────────────────────── */
exports.getSlotsForDay = async (req, res) => {
  try {
    const trainerId = Number(req.params.trainerId);
    const rawDate = req.query.date;
    const todayIso = new Date().toISOString().split('T')[0];
    
    /* Validate date param */
    const isValidIso = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
    const date = isValidIso(rawDate) ? rawDate : todayIso;

    if (!isValidIso(date)) {
      return res.status(400).json({ error: 'Query param "date" must be in YYYY-MM-DD format' });
    }

    /* 1️⃣ Fetch all raw slots and bookings for the day */
    const allSlots = await AvailabilitySlot.findAll({ where: { trainerId, date }, raw: true });
    const bookings = await BookingDate.findAll({
      where: { date },
      include: [{ model: Booking, attributes: [], where: { trainerId, status: 'active' } }],
      raw: true,
    });
    
    /* 2️⃣ Separate work from breaks and merge consecutive chunks */
    const workSlots = allSlots.filter(s => !s.isBreak);
    const breakSlots = allSlots.filter(s => s.isBreak);

    const mergedWork = mergeSlots(workSlots);
    const mergedBreaks = mergeSlots(breakSlots);
    const finalSlots = [...mergedWork, ...mergedBreaks];
    
    /* 3️⃣ Overlay booking info to determine availability */
    const withAvailability = finalSlots.map((s) => {
      const sN = toNum(s.startTime), eN = toNum(s.endTime);
      const isBooked = bookings.some((b) => {
        const bS = toNum(b.startTime), bE = toNum(b.endTime);
        return sN < bE && eN > bS; // Check for overlap
      });
      return { ...s, isAvailable: !isBooked };
    });

    res.json({ date, slots: withAvailability });

  } catch (err) {
    console.error('getSlotsForDay Error:', err);
    res.status(500).json({ error: 'Server error while fetching availability' });
  }
};


/* ────────────────────────────────────────────────────────────
    DELETE /api/trainers/:trainerId/availability/:id
────────────────────────────────────────────────────────────── */
exports.deleteSlot = async (req, res) => {
  try {
    const trainerId = Number(req.params.trainerId);
    const slotId = Number(req.params.id);

    const slot = await AvailabilitySlot.findOne({ where: { id: slotId, trainerId } });
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found or you do not own it.' });
    }

    await slot.destroy();
    res.status(200).json({ message: 'Slot deleted', id: slotId });
  } catch (err) {
    console.error('deleteSlot Error:', err);
    res.status(500).json({ error: 'Server error while deleting slot' });
  }
};

/* ────────────────────────────────────────────────────────────
    GET /api/trainers/:trainerId/available-slots?date=YYYY-MM-DD
   ACTION: Add this new function to your controller file.
────────────────────────────────────────────────────────────── */
exports.getAvailableSlots = async (req, res) => {
  try {
    const trainerId = Number(req.params.trainerId);
    const rawDate = req.query.date;
    const todayIso = new Date().toISOString().split('T')[0];

    /* 1️⃣ Validate date parameter */
    const isValidIso = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
    const date = isValidIso(rawDate) ? rawDate : todayIso;

    if (!isValidIso(date)) {
      return res.status(400).json({ error: 'Query param "date" must be in YYYY-MM-DD format' });
    }

    /* 2️⃣ Fetch all raw data for the day */
    // Get all potential 1-hour work slots (they are stored this way by upsertSlots)
    const workSlots = await AvailabilitySlot.findAll({
      where: { trainerId, date, isBreak: false },
      raw: true,
      order: [['startTime', 'ASC']],
    });

    // Get all breaks defined for that day
    const breakSlots = await AvailabilitySlot.findAll({
      where: { trainerId, date, isBreak: true },
      raw: true,
    });

    // Get all active bookings for that day
    const bookings = await BookingDate.findAll({
      where: { date },
      include: [{ model: Booking, attributes: [], where: { trainerId, status: 'active' } }],
      raw: true,
    });
    
    /* 3️⃣ Identify all "blocked" time intervals (breaks and bookings) */
    const blockers = [...breakSlots, ...bookings];

    /* 4️⃣ Filter work slots against the blockers */
    // A slot is truly available only if it does NOT overlap with any blocker.
    const availableSlots = workSlots.filter((slot) => {
      const slotStartNum = toNum(slot.startTime);
      const slotEndNum = toNum(slot.endTime);

      // Check if the slot overlaps with any blocker
      const isBlocked = blockers.some((blocker) => {
        const blockerStartNum = toNum(blocker.startTime);
        const blockerEndNum = toNum(blocker.endTime);
        
        // Standard overlap condition: true if intervals intersect
        return slotStartNum < blockerEndNum && slotEndNum > blockerStartNum;
      });

      return !isBlocked; // Keep the slot only if it's not blocked
    });

    res.json({ date, slots: availableSlots });

  } catch (err) {
    console.error('getAvailableSlots Error:', err);
    res.status(500).json({ error: 'Server error while fetching available slots' });
  }
};