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
const { expandBookingDates } = require('../../util/expandBookingDates.JS');

const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const isBetween = require('dayjs/plugin/isBetween');
dayjs.extend(isBetween);

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




// exports.createBooking = async (req, res) => {
//   const transaction = await sequelize.transaction();
//   try {
//     const {
//       userId,
//       serviceId,
//       trainerId: providedTrainerId,
//       address,
//       participants = [],
//       dates = [],
//     } = req.body;

//     if (!Array.isArray(dates) || dates.length === 0) {
//       return res.status(400).json({ message: 'At least one booking date is required' });
//     }

//     // Resolve trainer
//     let trainerId = providedTrainerId;
//     if (!trainerId) {
//       const service = await Service.findByPk(serviceId);
//       if (!service || !service.defaultTrainerId) {
//         throw new Error('No trainer specified and no default trainer found for this service');
//       }
//       trainerId = service.defaultTrainerId;
//     }

//     const trainer = await Trainer.findByPk(trainerId);
//     if (!trainer) throw new Error('Trainer not found');

//     // Determine initial status (auto-accept)
//     const initialStatus = trainer.autoAcceptRequests ? 'active' : 'pending_approval';

//     // Fetch user with extra fields for self-filtering
//     const user = await User.findByPk(userId, {
//       attributes: ['id', 'parentUserId', 'name', 'surname', 'email'],
//     });
//     if (!user) throw new Error('User not found');

//     const isApproved = user.parentUserId ? false : true;

//     // Create booking shell
//     const booking = await Booking.create(
//       {
//         userId,
//         serviceId,
//         trainerId,
//         address,
//         totalPrice: 0,
//         status: initialStatus,
//         isBookingConfirmed: false,
//         approved: isApproved,
//       },
//       { transaction }
//     );

//     // Create dates + compute price
//     let totalPrice = 0;
//     const createdBookingDates = [];

//     for (const dateObj of dates) {
//       const { date, startTime, endTime } = dateObj || {};
//       if (!date || !startTime || !endTime) {
//         throw new Error('Each date must include: { date, startTime, endTime }');
//       }

//       const startDateTime = new Date(`${date}T${startTime}`);
//       const endDateTime   = new Date(`${date}T${endTime}`);

//       if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
//         throw new Error('Invalid date or time format');
//       }
//       const hours = (endDateTime - startDateTime) / (1000 * 60 * 60);
//       if (hours <= 0) throw new Error('endTime must be after startTime');

//       totalPrice += hours * trainer.hourlyRate;

//       const bookingDate = await BookingDate.create(
//         { bookingId: booking.id, date, startTime, endTime },
//         { transaction }
//       );
//       createdBookingDates.push(bookingDate);
//     }

//     // ✅ Create participants (skip current user if included)
//     const createdParticipants = [];
//     if (Array.isArray(participants) && participants.length > 0) {
//       const selfFiltered = participants.filter((p) => {
//         // 1) Explicit flag
//         if (p.isSelf === true) return false;

//         // 2) Participant userId equals booking userId
//         if (p.userId && String(p.userId) === String(userId)) return false;

//         // 3) Same email
//         const emailMatches =
//           p.email && user.email &&
//           String(p.email).trim().toLowerCase() === String(user.email).trim().toLowerCase();

//         // 4) Same full name
//         const nameMatches =
//           p.name && p.surname && user.name && user.surname &&
//           String(p.name).trim().toLowerCase() === String(user.name).trim().toLowerCase() &&
//           String(p.surname).trim().toLowerCase() === String(user.surname).trim().toLowerCase();

//         return !(emailMatches || nameMatches);
//       });

//       const normalized = selfFiltered.map((p) => ({
//         ...p,
//         category: normalizeCategory(p.category), // uses helper already in this file
//         bookingId: booking.id,
//       }));

//       if (normalized.length > 0) {
//         const rows = await Participant.bulkCreate(normalized, { transaction, returning: true });
//         createdParticipants.push(...rows);
//       }
//     }

//     // Update price
//     await booking.update({ totalPrice }, { transaction });

//     await transaction.commit();

//     return res.status(201).json({
//       message: 'Booking created successfully',
//       booking: {
//         id: booking.id,
//         userId: booking.userId,
//         serviceId: booking.serviceId,
//         trainerId: booking.trainerId,
//         address: booking.address,
//         totalPrice: booking.totalPrice,
//         approved: booking.approved,
//         dates: createdBookingDates,
//         participants: createdParticipants,
//       },
//     });
//   } catch (error) {
//     console.error('Error creating booking:', error);
//     if (transaction.finished !== 'commit') {
//       await transaction.rollback();
//     }
//     return res.status(500).json({ error: error.message });
//   }
// };




function hmsToMinutes(hms) {
  const [H,M,S='0'] = hms.split(':').map(Number);
  return H*60 + M + (S ? Math.floor(S/60) : 0);
}

function diffHours(date, startTime, endTime) {
  const start = dayjs(`${date}T${startTime}`);
  const end = dayjs(`${date}T${endTime}`);
  return (end.diff(start, 'minute')) / 60;
}

function normalizeCategory(category) {
  switch (category) {
    case 'Adults': return 'Adult';
    case 'Teenagers': return 'Teenager';
    case 'Children': return 'Child';
    default: return category || 'Adult';
  }
}

// Expand mixed blocks: exact + rec (daily/weekly/monthly)
function expandDateBlocks(blocks) {
  const out = [];
  const pushInst = (date, startTime, endTime, meta) => {
    out.push({ date, startTime, endTime, meta });
  };

  for (const block of blocks) {
    const { kind } = block || {};
    if (!kind) continue;

    if (kind === 'exact') {
      const { date, startTime, endTime } = block;
      if (date && startTime && endTime) {
        const groupId = uuidv4();
        pushInst(date, startTime, endTime, { kind: 'exact', groupId });
      }
      continue;
    }

    if (kind === 'rec') {
      const { mode, rangeStart, rangeEnd, startTime, endTime, weekdays } = block;
      if (!mode || !rangeStart || !rangeEnd || !startTime || !endTime) continue;

      const start = dayjs(rangeStart);
      const end = dayjs(rangeEnd);
      if (!start.isValid() || !end.isValid() || end.isBefore(start)) continue;

      const groupId = uuidv4();
      if (mode === 'daily') {
        let cur = start.clone();
        while (!cur.isAfter(end)) {
          pushInst(cur.format('YYYY-MM-DD'), startTime, endTime,
            { kind: 'rec', mode: 'daily', rangeStart, rangeEnd, groupId });
          cur = cur.add(1, 'day');
        }
      } else if (mode === 'weekly') {
        // weekdays = ["MO","WE"] etc.; if missing → every day of week
        const map = { SU:0, MO:1, TU:2, WE:3, TH:4, FR:5, SA:6 };
        const chosen = Array.isArray(weekdays) && weekdays.length > 0 ? weekdays : ['MO','TU','WE','TH','FR','SA','SU'];
        let cur = start.clone();
        while (!cur.isAfter(end)) {
          const dow = cur.day(); // 0..6
          const tag = ['SU','MO','TU','WE','TH','FR','SA'][dow];
          if (chosen.includes(tag)) {
            pushInst(cur.format('YYYY-MM-DD'), startTime, endTime,
              { kind: 'rec', mode: 'weekly', rangeStart, rangeEnd, weekdays: chosen, groupId });
          }
          cur = cur.add(1, 'day');
        }
      } else if (mode === 'monthly') {
        // Step month by month, same day-of-month as rangeStart (clamped if month too short)
        const dom = start.date();
        let cur = start.clone().startOf('month').date(dom);
        // ensure first date >= rangeStart
        if (cur.isBefore(start)) cur = cur.add(1, 'month').date(Math.min(dom, cur.daysInMonth()));
        while (!cur.isAfter(end)) {
          pushInst(cur.format('YYYY-MM-DD'), startTime, endTime,
            { kind: 'rec', mode: 'monthly', rangeStart, rangeEnd, groupId });
          cur = cur.add(1, 'month').date(Math.min(dom, cur.daysInMonth()));
        }
      }
    }
  }

  // de-duplicate (same date+start+end from overlapping blocks)
  const seen = new Set();
  const dedup = [];
  for (const inst of out) {
    const key = `${inst.date}|${inst.startTime}|${inst.endTime}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedup.push(inst);
    }
  }

  // sort by date/time
  dedup.sort((a,b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return hmsToMinutes(a.startTime) - hmsToMinutes(b.startTime);
  });

  return dedup;
}

// Check for internal overlaps within the same new booking payload
function findInternalOverlaps(instances) {
  const conflicts = [];
  const byDate = instances.reduce((acc, i) => {
    (acc[i.date] ||= []).push(i);
    return acc;
  }, {});
  for (const date of Object.keys(byDate)) {
    const arr = byDate[date].slice().sort((a,b)=>hmsToMinutes(a.startTime)-hmsToMinutes(b.startTime));
    for (let i=1;i<arr.length;i++){
      const prev = arr[i-1], cur = arr[i];
      // overlap if prev.start < cur.end && prev.end > cur.start
      if (prev.startTime < cur.endTime && prev.endTime > cur.startTime) {
        conflicts.push({ date, a: prev, b: cur });
      }
    }
  }
  return conflicts;
}

// Query DB for collisions against trainer (and user)
async function findConflicts({ trainerId, userId, instances }) {
  const conflicts = [];

  for (const inst of instances) {
    // trainer collisions (active/pending/anything not canceled)
    const trainerHit = await BookingDate.findOne({
      where: {
        date: inst.date,
        [Op.and]: [
          { startTime: { [Op.lt]: inst.endTime } },
          { endTime:   { [Op.gt]: inst.startTime } }
        ]
      },
      include: [{
        model: Booking,
        required: true,
        where: {
          trainerId,
          status: { [Op.ne]: 'canceled' }
        },
        attributes: ['id','userId','trainerId','status']
      }]
    });

    if (trainerHit) {
      conflicts.push({
        scope: 'trainer',
        date: inst.date,
        startTime: inst.startTime,
        endTime: inst.endTime,
        clashesWithBookingId: trainerHit.Booking.id
      });
      continue; // no need to check user if trainer already blocks
    }

    // user collisions (optional but requested)
    const userHit = await BookingDate.findOne({
      where: {
        date: inst.date,
        [Op.and]: [
          { startTime: { [Op.lt]: inst.endTime } },
          { endTime:   { [Op.gt]: inst.startTime } }
        ]
      },
      include: [{
        model: Booking,
        required: true,
        where: {
          userId,
          status: { [Op.ne]: 'canceled' }
        },
        attributes: ['id','userId','trainerId','status']
      }]
    });

    if (userHit) {
      conflicts.push({
        scope: 'user',
        date: inst.date,
        startTime: inst.startTime,
        endTime: inst.endTime,
        clashesWithBookingId: userHit.Booking.id
      });
    }
  }

  return conflicts;
}

// Build a human-friendly summary per input block (groupId)
function summarizeSchedules(createdDates) {
  // group by sourceGroupId
  const groups = new Map();
  for (const d of createdDates) {
    const gid = d.sourceGroupId || `g_${d.id}`;
    if (!groups.has(gid)) groups.set(gid, []);
    groups.get(gid).push(d);
  }

  const out = [];
  for (const [gid, rows] of groups.entries()) {
    const r0 = rows[0];
    if (r0.sourceKind === 'rec') {
      out.push({
        type: r0.sourceMode, // daily | weekly | monthly
        rangeStart: r0.sourceRangeStart,
        rangeEnd: r0.sourceRangeEnd,
        startTime: rows[0].startTime,
        endTime: rows[0].endTime,
        weekdays: r0.sourceWeekdays || null,
        generatedDates: rows.length
      });
    } else {
      // exact list
      out.push({
        type: 'exact',
        occurrences: rows
          .map(r => ({ date: r.date, startTime: r.startTime, endTime: r.endTime }))
          .sort((a,b)=> a.date===b.date
              ? hmsToMinutes(a.startTime)-hmsToMinutes(b.startTime)
              : a.date.localeCompare(b.date))
      });
    }
  }

  return out;
}

// ============== FULL CONTROLLER METHOD =================
exports.createBooking = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      userId,
      serviceId,
      selectedTrainerId,          // <-- from your payload
      trainerId: providedTrainerId, // (back-compat)
      address,
      participants = [],
      dates = [],
    } = req.body;

    if (!Array.isArray(dates) || dates.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'At least one date block is required' });
    }

    const trainerId = selectedTrainerId || providedTrainerId;
    if (!trainerId) {
      await transaction.rollback();
      return res.status(400).json({ message: 'trainerId (selectedTrainerId) is required' });
    }

    const trainer = await Trainer.findByPk(trainerId);
    if (!trainer) throw new Error('Trainer not found');

    const user = await User.findByPk(userId, { attributes: ['id','parentUserId','name','surname','email'] });
    if (!user) throw new Error('User not found');

    // Expand recurrence
    const expanded = expandDateBlocks(dates);
    if (expanded.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'No valid dates after expansion' });
    }

    // Internal overlaps (within the submitted payload)
    const internal = findInternalOverlaps(expanded);
    if (internal.length) {
      await transaction.rollback();
      return res.status(409).json({
        message: 'Your selected times overlap each other',
        internalConflicts: internal.map(c => ({
          date: c.date,
          a: { startTime: c.a.startTime, endTime: c.a.endTime },
          b: { startTime: c.b.startTime, endTime: c.b.endTime }
        }))
      });
    }

    // Collisions with existing bookings for trainer/user
    const external = await findConflicts({ trainerId, userId, instances: expanded });
    if (external.length) {
      await transaction.rollback();
      return res.status(409).json({
        message: 'Conflicting time slots found',
        conflicts: external
      });
    }

    // Determine initial status
    const initialStatus = trainer.autoAcceptRequests ? 'active' : 'pending_approval';
    const isApproved = user.parentUserId ? false : true;

    // Create booking shell
    const booking = await Booking.create({
      userId,
      serviceId,
      trainerId,
      address,
      totalPrice: 0,
      status: initialStatus,
      isBookingConfirmed: false,
      approved: isApproved
    }, { transaction });

    // Participants (skip self)
    if (participants.length) {
      const filtered = participants.filter((p) => {
        if (p.isSelf === true) return false;
        if (p.userId && String(p.userId) === String(userId)) return false;
        const emailMatches = p.email && user.email && p.email.trim().toLowerCase() === user.email.trim().toLowerCase();
        const nameMatches =
          p.name && p.surname && user.name && user.surname &&
          p.name.trim().toLowerCase() === user.name.trim().toLowerCase() &&
          p.surname.trim().toLowerCase() === user.surname.trim().toLowerCase();
        return !(emailMatches || nameMatches);
      }).map(p => ({ ...p, category: normalizeCategory(p.category), bookingId: booking.id }));

      if (filtered.length) await Participant.bulkCreate(filtered, { transaction });
    }

    // Create dates + compute price
    let totalPrice = 0;
    for (const inst of expanded) {
      const hours = diffHours(inst.date, inst.startTime, inst.endTime);
      if (hours <= 0) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Invalid time range (end <= start)' });
      }
      totalPrice += hours * trainer.hourlyRate;

      await BookingDate.create({
        bookingId: booking.id,
        date: inst.date,
        startTime: inst.startTime,
        endTime: inst.endTime,
        sourceKind: inst.meta.kind,
        sourceMode: inst.meta.mode || null,
        sourceRangeStart: inst.meta.rangeStart || null,
        sourceRangeEnd: inst.meta.rangeEnd || null,
        sourceWeekdays: inst.meta.weekdays || null,
        sourceGroupId: inst.meta.groupId || null
      }, { transaction });
    }

    await booking.update({ totalPrice }, { transaction });
    await transaction.commit();

    // Fetch created dates to construct schedules summary
    const createdBookingDates = await BookingDate.findAll({
      where: { bookingId: booking.id },
      order: [['date','ASC'], ['startTime','ASC']]
    });

    const schedules = summarizeSchedules(createdBookingDates.map(d => d.get({ plain: true })));

    return res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        id: booking.id,
        userId: booking.userId,
        serviceId: booking.serviceId,
        trainerId: booking.trainerId,
        address: booking.address,
        totalPrice: booking.totalPrice,
        approved: booking.approved,
        schedules,             // <-- NEW: what you show as “daily/weekly/monthly/exact”
        dates: createdBookingDates
      }
    });
  } catch (error) {
    if (transaction.finished !== 'commit') await transaction.rollback();
    console.error('createBooking error:', error);
    res.status(500).json({ error: error.message });
  }
};



// exports.getTrainerActivityBookings = async (req, res) => {
//   try {
//     const { trainerId } = req.params;
//     const now = new Date();

//     const bookings = await Booking.findAll({
//       where: { trainerId },
//       order: [['createdAt', 'DESC']],
//       include: [
//         { model: Participant },
//         { model: BookingDate, attributes: ['date', 'startTime', 'endTime', 'createdAt'] },
//         {
//           model: Service,
//           attributes: ['id', 'name', 'description', 'image', 'duration', 'hourlyRate', 'level'],
//           include: [
//             { model: ServiceDetails },
//             { model: Trainer, attributes: ['id', 'name', 'surname', 'avatar'] },
//             { model: SubCategory, include: [Category] }
//           ]
//         }
//       ]
//     });

//     const categorized = {
//       opportunities: [],
//       upcoming: [],
//       past: []
//     };

//     for (const booking of bookings) {
//       const bookingJson = booking.toJSON();
//       const latestBookingDate = bookingJson.BookingDates?.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

//       if (booking.status === 'pending_approval') {
//         categorized.opportunities.push(bookingJson);
//       } else if (booking.status === 'active') {
//         if (latestBookingDate) {
//           const endDateTime = new Date(`${latestBookingDate.date}T${latestBookingDate.endTime}`);
//           if (endDateTime > now) {
//             categorized.upcoming.push(bookingJson);
//           } else {
//             bookingJson.status = 'completed';
//             categorized.past.push(bookingJson);
//           }
//         }
//       } else {
//         categorized.past.push(bookingJson);
//       }
//     }

//     return res.status(200).json(categorized);

//   } catch (error) {
//     console.error('Error fetching trainer activity bookings:', error);
//     return res.status(500).json({ error: 'Failed to fetch trainer activity bookings.' });
//   }
// };

// ✅ TESTING VERSION (with static trainerId)


exports.getTrainerActivityBookings = async (req, res) => {
  try {
    const { trainerId } = req.params;
    const now = new Date();

    const bookings = await Booking.findAll({
      where: { trainerId },
      order: [['createdAt', 'DESC']],
      include: [
        { model: Participant },
        { model: BookingDate, attributes: ['date','startTime','endTime','createdAt','sourceKind','sourceMode','sourceRangeStart','sourceRangeEnd','sourceWeekdays','sourceGroupId'] },
        {
          model: Service,
          attributes: ['id','name','description','image','duration','hourlyRate','level'],
          include: [
            { model: ServiceDetails },
            { model: Trainer, attributes: ['id','name','surname','avatar'] },
            { model: SubCategory, include: [Category] }
          ]
        }
      ]
    });

    const categorized = { opportunities: [], upcoming: [], past: [] };

    for (const booking of bookings) {
      const b = booking.toJSON();

      // schedules summary
      const map = new Map();
      for (const r of (b.BookingDates || [])) {
        const gid = r.sourceGroupId || `g_${r.date}_${r.startTime}_${r.endTime}`;
        if (!map.has(gid)) map.set(gid, []);
        map.get(gid).push(r);
      }
      b.schedules = [];
      for (const [gid, arr] of map.entries()) {
        const r0 = arr[0];
        if (r0.sourceKind === 'rec') {
          b.schedules.push({
            type: r0.sourceMode,
            rangeStart: r0.sourceRangeStart,
            rangeEnd: r0.sourceRangeEnd,
            startTime: r0.startTime,
            endTime: r0.endTime,
            weekdays: r0.sourceWeekdays || null,
            generatedDates: arr.length
          });
        } else {
          b.schedules.push({
            type: 'exact',
            occurrences: arr
              .map(x => ({ date: x.date, startTime: x.startTime, endTime: x.endTime }))
              .sort((a,b)=> a.date===b.date
                ? a.startTime.localeCompare(b.startTime)
                : a.date.localeCompare(b.date))
          });
        }
      }

      const latest = b.BookingDates?.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt))[0];

      if (booking.status === 'pending_approval') {
        categorized.opportunities.push(b);
      } else if (booking.status === 'active') {
        if (latest) {
          const endDateTime = new Date(`${latest.date}T${latest.endTime}`);
          if (endDateTime > now) categorized.upcoming.push(b);
          else {
            b.status = 'completed';
            categorized.past.push(b);
          }
        }
      } else {
        categorized.past.push(b);
      }
    }

    return res.status(200).json(categorized);
  } catch (error) {
    console.error('Error fetching trainer activity bookings:', error);
    return res.status(500).json({ error: 'Failed to fetch trainer activity bookings.' });
  }
};



exports.approveBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await Booking.findByPk(id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        // --- FOR TESTING ONLY ---
        // This temporarily bypasses the real security check and assumes
        // the action is being performed by trainer with ID 260.
        const STATIC_TRAINER_ID = 260;
        if (booking.trainerId !== STATIC_TRAINER_ID) {
            return res.status(403).json({ message: 'This booking does not belong to the test trainer (ID 260).' });
        }
        // --- END OF TEST CODE ---

        /*
        // --- REAL SECURITY CHECK (Use this in production) ---
        const loggedInUserId = req.user.id; 
        const trainer = await Trainer.findOne({ where: { userId: loggedInUserId } });
        if (!trainer || booking.trainerId !== trainer.id) {
            return res.status(403).json({ message: 'You are not authorized to approve this booking.' });
        }
        // --- END OF REAL CHECK ---
        */
        
        if (booking.status !== 'pending_approval') {
            return res.status(400).json({ message: `Booking cannot be approved. Current status: ${booking.status}` });
        }

        booking.status = 'active';
        await booking.save();

        res.status(200).json({ message: 'Booking approved successfully.', booking });

    } catch (error) {
        console.error('Error approving booking:', error);
        res.status(500).json({ error: 'Failed to approve booking.' });
    }
};


// ✅ TESTING VERSION (with static trainerId)
exports.rejectBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await Booking.findByPk(id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }
        
        // --- FOR TESTING ONLY ---
        // This temporarily bypasses the real security check and assumes
        // the action is being performed by trainer with ID 260.
        const STATIC_TRAINER_ID = 260;
        if (booking.trainerId !== STATIC_TRAINER_ID) {
            return res.status(403).json({ message: 'This booking does not belong to the test trainer (ID 260).' });
        }
        // --- END OF TEST CODE ---

        /*
        // --- REAL SECURITY CHECK (Use this in production) ---
        const loggedInUserId = req.user.id;
        const trainer = await Trainer.findOne({ where: { userId: loggedInUserId } });
        if (!trainer || booking.trainerId !== trainer.id) {
            return res.status(403).json({ message: 'You are not authorized to reject this booking.' });
        }
        // --- END OF REAL CHECK ---
        */

        if (booking.status !== 'pending_approval') {
            return res.status(400).json({ message: `Booking cannot be rejected. Current status: ${booking.status}` });
        }

        booking.status = 'canceled';
        await booking.save();

        res.status(200).json({ message: 'Booking rejected successfully.', booking });

    } catch (error) {
        console.error('Error rejecting booking:', error);
        res.status(500).json({ error: 'Failed to reject booking.' });
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

// ✅ FULL REPLACEMENT
exports.createSubUserBooking = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      parentUserId,
      subUserId,
      serviceId,
      trainerId: providedTrainerId,
      address,
      participants = [],
      dates = [],
    } = req.body;

    if (!parentUserId || !subUserId || !serviceId) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Parent user ID, sub-user ID, and service ID are required' });
    }
    if (!Array.isArray(dates) || dates.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'At least one booking date is required' });
    }

    // Validate sub-user relationship
    const subUser = await User.findByPk(subUserId, { attributes: ['id', 'parentUserId'] });
    if (!subUser) throw new Error('Sub-user not found');
    if (String(subUser.parentUserId) !== String(parentUserId)) {
      throw new Error('This sub-user is not associated with the provided parent user');
    }

    // Resolve trainer
    let trainerId = providedTrainerId;
    if (!trainerId) {
      const service = await Service.findByPk(serviceId);
      if (!service || !service.defaultTrainerId) {
        throw new Error('No trainer specified and no default trainer found for this service');
      }
      trainerId = service.defaultTrainerId;
    }
    const trainer = await Trainer.findByPk(trainerId);
    if (!trainer) throw new Error('Trainer not found');

    // Create booking (sub-user is the owner)
    const booking = await Booking.create(
      {
        userId: subUserId,
        serviceId,
        trainerId,
        address,
        totalPrice: 0,
        status: 'active',          // sub-user already accepted flow
        isBookingConfirmed: false,
        approved: true,            // for sub-user flow you marked as approved immediately
      },
      { transaction }
    );

    // 🔑 Expand mixed dates (exact/recurrence) into concrete rows
    const expandedDates = expandBookingDates(dates);

    // Add participants if provided
    const createdParticipants = [];
    if (participants && participants.length > 0) {
      const normalized = participants.map((p) => ({
        ...p,
        category: normalizeCategory(p.category),
        bookingId: booking.id,
      }));
      const rows = await Participant.bulkCreate(normalized, { transaction, returning: true });
      createdParticipants.push(...rows);
    }

    // Create BookingDates and compute total price
    let totalPrice = 0;
    const createdBookingDates = [];
    for (const d of expandedDates) {
      const { date, startTime, endTime } = d;

      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime   = new Date(`${date}T${endTime}`);
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error('Invalid date or time format');
      }
      const hours = (endDateTime - startDateTime) / (1000 * 60 * 60);
      if (hours <= 0) throw new Error('endTime must be after startTime');

      totalPrice += hours * trainer.hourlyRate;

      const bookingDate = await BookingDate.create(
        { bookingId: booking.id, date, startTime, endTime },
        { transaction }
      );
      createdBookingDates.push(bookingDate);
    }

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
        participants: createdParticipants,
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
    // keep statuses fresh
    await updatePastBookingsStatus();

    const { userId } = req.params;
    const page = parseInt(req.query.page ?? 1, 10);
    const limit = parseInt(req.query.limit ?? 10, 10);
    const offset = (page - 1) * limit;

    const { count, rows } = await Booking.findAndCountAll({
      where: { userId },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true,
      include: [
        { model: Participant },
        {
          model: BookingDate,
          attributes: [
            'id',
            'date',
            'startTime',
            'endTime',
            'createdAt',
            // recurrence/source meta
            'sourceKind',
            'sourceMode',
            'sourceRangeStart',
            'sourceRangeEnd',
            'sourceWeekdays',
            'sourceGroupId',
          ],
        },
        {
          model: Service,
          attributes: ['id','name','description','image','duration','hourlyRate','level'],
          include: [
            {
              model: ServiceDetails,
              attributes: [
                'fullDescription','highlights','whatsIncluded','whatsNotIncluded',
                'recommendations','coachInfo',
              ],
            },
            {
              model: Trainer,
              attributes: ['id','name','surname','avatar','hourlyRate','userRating'],
            },
            {
              model: SubCategory,
              attributes: ['id','name'],
              include: [{ model: Category, attributes: ['id','name'] }],
            },
          ],
        },
      ],
    });

    // attach group session meta (if any)
    const groupSessionIds = [...new Set(rows.map(b => b.groupSessionId).filter(Boolean))];
    const groupSessions = groupSessionIds.length
      ? await GroupSession.findAll({
          where: { id: groupSessionIds },
          attributes: ['id','maxGroupSize','currentEnrollment'],
        })
      : [];
    const groupMap = groupSessions.reduce((acc, s) => (acc[s.id] = s, acc), {});

    const bookings = rows.map((b) => {
      const json = b.toJSON();
      const createdDates = (json.BookingDates ?? []).map(d => ({ ...d }));
      json.schedules = summarizeSchedules(createdDates);
      json.latestBookingDate =
        createdDates
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
      json.groupSessionData = json.groupSessionId ? groupMap[json.groupSessionId] || null : null;
      return json;
    });

    res.status(200).json({
      totalItems: count,
      totalBookingsOnCurrentPage: bookings.length,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      bookings,
    });
  } catch (error) {
    console.error('Error fetching paginated bookings:', error);
    res.status(500).json({ error: 'Failed to fetch user bookings.' });
  }
};



exports.getPaginatedFilteredBookingsOfUser = async (req, res) => {
  try {
    // keep statuses fresh (optional but helpful)
    await updatePastBookingsStatus();

    const { userId } = req.params;
    const page = parseInt(req.query.page ?? 1, 10);
    const limit = parseInt(req.query.limit ?? 10, 10);
    const {
      status,
      startDate,
      endDate,
      categoryOrSubcategory,
    } = req.query;

    const offset = (page - 1) * limit;

    // --- WHERE: base ---
    const whereClause = { userId };

    // --- WHERE: status filter with special rule ---
    // If frontend asks for `status=active`, also include `pending_approval`.
    if (status) {
      if (status === 'active') {
        whereClause.status = { [Op.in]: ['active', 'pending_approval'] };
      } else {
        whereClause.status = status;
      }
    }

    // --- WHERE: bookingDate window ---
    const bookingDateWhere = {};
    if (startDate) {
      bookingDateWhere.date = { [Op.gte]: startDate };
    }
    if (endDate) {
      bookingDateWhere.date = { ...(bookingDateWhere.date || {}), [Op.lte]: endDate };
    }
    const requireDates = Object.keys(bookingDateWhere).length > 0;

    // --- category/subcategory include ---
    const subCategoryInclude = {
      model: SubCategory,
      attributes: ['id','name'],
      include: [{ model: Category, attributes: ['id','name'] }],
      required: false,
    };
    if (categoryOrSubcategory) {
      subCategoryInclude.required = true;
      subCategoryInclude.where = {
        [Op.or]: [
          { name: categoryOrSubcategory },             // SubCategory.name
          { '$Category.name$': categoryOrSubcategory } // Category.name
        ]
      };
    }

    const serviceInclude = {
      model: Service,
      attributes: ['id','name','description','image','duration','hourlyRate','level'],
      required: !!categoryOrSubcategory,
      include: [
        {
          model: ServiceDetails,
          attributes: [
            'fullDescription','highlights','whatsIncluded','whatsNotIncluded',
            'recommendations','coachInfo',
          ],
        },
        {
          model: Trainer,
          attributes: ['id','name','surname','avatar','hourlyRate','userRating'],
        },
        subCategoryInclude,
      ],
    };

    const { count, rows } = await Booking.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true,
      include: [
        { model: Participant },
        {
          model: BookingDate,
          where: requireDates ? bookingDateWhere : undefined,
          required: requireDates,
          attributes: [
            'id',
            'date',
            'startTime',
            'endTime',
            'createdAt',
            // recurrence/source meta
            'sourceKind',
            'sourceMode',
            'sourceRangeStart',
            'sourceRangeEnd',
            'sourceWeekdays',
            'sourceGroupId',
          ],
        },
        serviceInclude,
      ],
    });

    // group session meta
    const groupSessionIds = [...new Set(rows.map(b => b.groupSessionId).filter(Boolean))];
    const groupSessions = groupSessionIds.length
      ? await GroupSession.findAll({
          where: { id: groupSessionIds },
          attributes: ['id','maxGroupSize','currentEnrollment'],
        })
      : [];
    const groupMap = groupSessions.reduce((acc, s) => (acc[s.id] = s, acc), {});

    const bookings = rows.map((b) => {
      const json = b.toJSON();
      const createdDates = (json.BookingDates ?? []).map(d => ({ ...d }));

      // schedules and latest
      json.schedules = summarizeSchedules(createdDates);
      json.latestBookingDate =
        createdDates
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

      // attach group session quick meta if present
      json.groupSessionData = json.groupSessionId ? groupMap[json.groupSessionId] || null : null;

      // ✅ UI status/message logic:
      // If not approved OR status is pending_approval => show "pending approval"
      // Otherwise show the actual status.
      const isPending = (json.status === 'pending_approval') || (json.approved === false);
      json.displayStatus = isPending ? 'pending approval' : json.status;

      // Optional: a short UI flag if you prefer
      json.isPendingApproval = isPending;

      return json;
    });

    res.json({
      totalItems: count,
      totalBookingsOnCurrentPage: bookings.length,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      bookings,
    });
  } catch (error) {
    console.error('Error fetching filtered bookings with pagination:', error);
    res.status(500).json({ error: 'Failed to fetch bookings with pagination.' });
  }
};


exports.getAllBookingsOfUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const rows = await Booking.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [
        { model: Participant },
        {
          model: BookingDate,
          attributes: [
            'id',
            'date',
            'startTime',
            'endTime',
            'createdAt',
            // recurrence/source meta
            'sourceKind',
            'sourceMode',
            'sourceRangeStart',
            'sourceRangeEnd',
            'sourceWeekdays',
            'sourceGroupId',
          ],
        },
        {
          model: Service,
          attributes: ['id','name','description','image','duration','hourlyRate','level'],
          include: [
            {
              model: ServiceDetails,
              attributes: [
                'fullDescription','highlights','whatsIncluded','whatsNotIncluded',
                'recommendations','coachInfo',
              ],
            },
            {
              model: Trainer,
              through: { attributes: [] },
              attributes: ['id','name','surname','avatar','hourlyRate','userRating'],
            },
            {
              model: SubCategory,
              attributes: ['id','name'],
              include: [{ model: Category, attributes: ['id','name'] }],
            },
          ],
        },
      ],
    });

    // hydrate group session
    const groupSessionIds = [...new Set(rows.map(b => b.groupSessionId).filter(Boolean))];
    const sessionMap = {};
    if (groupSessionIds.length) {
      const sessions = await GroupSession.findAll({
        where: { id: groupSessionIds },
        attributes: ['id','date','startTime','endTime','maxGroupSize','currentEnrollment','status'],
        include: [
          { model: Trainer, attributes: ['id','name','surname'] },
          { model: Service, attributes: ['id','name','description','image'] },
        ],
      });
      sessions.forEach(s => { sessionMap[s.id] = s; });
    }

    const bookings = rows.map((b) => {
      const json = b.toJSON();
      const createdDates = (json.BookingDates ?? []).map(d => ({ ...d }));
      json.schedules = summarizeSchedules(createdDates);
      json.latestBookingDate =
        createdDates
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
      json.groupSession = json.groupSessionId ? (sessionMap[json.groupSessionId] || null) : null;
      return json;
    });

    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findOne({
      where: { id },
      include: [
        {
          model: Participant,
          attributes: ['id','name','surname','age','category'],
        },
        {
          model: BookingDate,
          attributes: [
            'id',
            'date',
            'startTime',
            'endTime',
            'createdAt',
            // recurrence/source meta
            'sourceKind',
            'sourceMode',
            'sourceRangeStart',
            'sourceRangeEnd',
            'sourceWeekdays',
            'sourceGroupId',
          ],
          order: [['date','ASC'], ['startTime','ASC']],
        },
        {
          model: Service,
          attributes: ['id','name','description','image','duration','hourlyRate','level'],
          include: [
            {
              model: ServiceDetails,
              attributes: [
                'fullDescription','highlights','whatsIncluded','whatsNotIncluded',
                'recommendations','coachInfo',
              ],
            },
            {
              model: Trainer,
              through: { attributes: [] },
              attributes: ['id','name','surname','avatar','hourlyRate','userRating'],
            },
          ],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const json = booking.toJSON();
    const createdDates = (json.BookingDates ?? []).map(d => ({ ...d }));
    json.schedules = summarizeSchedules(createdDates);

    // group session (optional)
    if (booking.groupSessionId) {
      const gs = await GroupSession.findByPk(booking.groupSessionId, {
        attributes: ['id','date','startTime','endTime','maxGroupSize','currentEnrollment','status'],
        include: [
          { model: Trainer, attributes: ['id','name','surname'] },
          { model: Service, attributes: ['id','name','description','image'] },
        ],
      });
      json.groupSession = gs || null;
    }

    res.status(200).json(json);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'An error occurred while fetching the booking.' });
  }
};

exports.getBookingsByIds = async (req, res) => {
  try {
    const { ids, userId } = req.query;

    if (!ids) return res.status(400).json({ message: 'Booking IDs are required' });
    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    const bookingIds = ids.split(',').map(Number).filter(Boolean);

    const rows = await Booking.findAll({
      where: { id: bookingIds, userId },
      order: [['createdAt', 'DESC']],
      include: [
        { model: Participant, required: false },
        {
          model: BookingDate,
          attributes: [
            'id',
            'date',
            'startTime',
            'endTime',
            'createdAt',
            // recurrence/source meta
            'sourceKind',
            'sourceMode',
            'sourceRangeStart',
            'sourceRangeEnd',
            'sourceWeekdays',
            'sourceGroupId',
          ],
        },
        {
          model: Service,
          attributes: ['id','name','description','image','duration','hourlyRate','level'],
          include: [
            {
              model: ServiceDetails,
              attributes: [
                'fullDescription','highlights','whatsIncluded','whatsNotIncluded',
                'recommendations','whatsToBring','coachInfo',
              ],
            },
            {
              model: Trainer,
              through: { attributes: [] },
              attributes: ['id','name','surname','avatar','hourlyRate','userRating'],
            },
          ],
        },
      ],
    });

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'No bookings found' });
    }

    const bookings = rows.map((b) => {
      const json = b.toJSON();

      // compute schedules
      const createdDates = (json.BookingDates ?? []).map(d => ({ ...d }));
      json.schedules = summarizeSchedules(createdDates);

      // keep the single "latest" date if you still want that shape
      json.BookingDates = createdDates
        .slice()
        .sort((a, b) => new Date(`${b.date}T${b.endTime}`) - new Date(`${a.date}T${a.endTime}`))
        .slice(0, 1);

      // expose a convenient selected trainer (first service trainer) if you relied on that
      json.Trainer = json.Service?.Trainers?.[0] || null;

      return json;
    });

    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching bookings by IDs:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ✅ FULL REPLACEMENT
exports.editBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { address, participants = [], dates = [] } = req.body;

    // Find the booking
    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Update address if provided
    booking.address = address || booking.address;

    // Normalize + replace participants
    await Participant.destroy({ where: { bookingId: id } });
    if (Array.isArray(participants) && participants.length > 0) {
      const normalizedParticipants = participants.map((p) => ({
        ...p,
        category: normalizeCategory(p.category),
        bookingId: id,
      }));
      await Participant.bulkCreate(normalizedParticipants);
    }

    // Get trainer for pricing
    const trainer = await Trainer.findByPk(booking.trainerId);
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }

    // Replace dates and recompute totalPrice
    await BookingDate.destroy({ where: { bookingId: id } });

    let totalPrice = 0;

    if (Array.isArray(dates) && dates.length > 0) {
      // 🔑 Expand mixed dates (exact/recurrence) into concrete rows
      const expandedDates = expandBookingDates(dates);

      const dateRows = expandedDates.map(({ date, startTime, endTime }) => {
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime   = new Date(`${date}T${endTime}`);
        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
          throw new Error('Invalid date format for start time or end time');
        }
        const hours = (endDateTime - startDateTime) / (1000 * 60 * 60);
        if (hours <= 0) {
          throw new Error('End time must be greater than start time');
        }

        totalPrice += hours * trainer.hourlyRate;
        return { date, startTime, endTime, bookingId: id };
      });

      if (dateRows.length > 0) {
        await BookingDate.bulkCreate(dateRows);
      }
    }

    booking.totalPrice = totalPrice;
    await booking.save();

    return res.status(200).json(booking);
  } catch (error) {
    console.error('Error editing booking:', error);
    return res.status(500).json({ error: error.message });
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
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params; // Extract the booking ID from the request parameters

    // Find the booking by its ID within the transaction
    const booking = await Booking.findByPk(id, { transaction });
    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Booking not found' });
    }

    // If the booking is already canceled, no action is needed
    if (booking.status === 'canceled') {
      await transaction.rollback();
      return res.status(400).json({ message: 'This booking has already been canceled.' });
    }
    
    // If it is a group session booking, decrement the enrollment
    if (booking.groupSessionId) {
      const groupSession = await GroupSession.findByPk(booking.groupSessionId, { transaction });
      if (groupSession) {
        // Decrement the current enrollment
        await groupSession.decrement('currentEnrollment', { by: 1, transaction });
        
        // Optionally, if the session was full ('completed'), set it back to 'active'
        if (groupSession.status === 'completed') {
            groupSession.status = 'active';
            await groupSession.save({ transaction });
        }
      }
    }

    // For all bookings, delete the associated BookingDate entries to free up the schedule
    await BookingDate.destroy({
      where: {
        bookingId: id,
      },
      transaction,
    });

    // Update the status of the booking to 'canceled'
    booking.status = 'canceled';
    await booking.save({ transaction }); // Save the updated booking

    // Commit all changes if everything was successful
    await transaction.commit();

    res.status(200).json({ message: 'Booking canceled successfully' }); // Return success message
  } catch (error) {
    // If any step fails, roll back all database changes
    await transaction.rollback();
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

exports.getTrainerBookingsCategorized = async (req, res) => {
  try {
    const { trainerId } = req.params;
    const now = new Date();

    const rows = await Booking.findAll({
      where: { trainerId },
      order: [['createdAt', 'DESC']],
      distinct: true,
      include: [
        { model: Participant },
        {
          model: BookingDate,
          attributes: [
            'id',
            'date',
            'startTime',
            'endTime',
            'createdAt',
            'sourceKind',
            'sourceMode',
            'sourceRangeStart',
            'sourceRangeEnd',
            'sourceWeekdays',
            'sourceGroupId',
          ],
        },
        {
          model: Service,
          attributes: ['id','name','description','image','duration','hourlyRate','level'],
          include: [
            {
              model: ServiceDetails,
              attributes: [
                'fullDescription','highlights','whatsIncluded','whatsNotIncluded',
                'recommendations','coachInfo',
              ],
            },
            {
              model: Trainer,
              attributes: ['id','name','surname','avatar','hourlyRate','userRating'],
            },
            {
              model: SubCategory,
              attributes: ['id','name'],
              include: [{ model: Category, attributes: ['id','name'] }],
            },
          ],
        },
      ],
    });

    const groupSessionIds = rows.map(b => b.groupSessionId).filter(id => id != null);
    const groupSessions = groupSessionIds.length
      ? await GroupSession.findAll({
          where: { id: groupSessionIds },
          attributes: ['id','maxGroupSize','currentEnrollment'],
        })
      : [];
    const sessionMap = groupSessions.reduce((acc, s) => (acc[s.id] = s, acc), {});

    const enriched = rows.map(b => {
      const json = b.toJSON();
      const createdDates = (json.BookingDates ?? []).map(d => ({ ...d }));
      json.schedules = summarizeSchedules(createdDates);
      json.groupSessionData = json.groupSessionId ? (sessionMap[json.groupSessionId] || null) : null;
      json.latestBookingDate =
        createdDates
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
      return json;
    });

    const categorized = { upcoming: [], past: [], canceled: [] };
    for (const b of enriched) {
      if (b.status === 'canceled') {
        categorized.canceled.push(b);
        continue;
      }
      if (!b.latestBookingDate) {
        categorized.past.push(b);
        continue;
      }
      const endTs = new Date(`${b.latestBookingDate.date}T${b.latestBookingDate.endTime}`);
      if (endTs > now) categorized.upcoming.push(b);
      else categorized.past.push(b);
    }

    return res.status(200).json(categorized);
  } catch (error) {
    console.error('getTrainerBookingsCategorized error:', error);
    return res.status(500).json({ error: 'Failed to fetch trainer bookings.' });
  }
};


exports.getLastTwoBookingsOfUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const bookings = await Booking.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']], // Sort by newest first
      limit: 2, // Only take the last 2 bookings
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

    return res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching last two bookings of user:', error);
    res.status(500).json({ error: 'Failed to fetch last two bookings.' });
  }
};
