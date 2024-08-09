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
  
      // Calculate total price based on participants and dates
      const trainer = await Trainer.findByPk(trainerId);
      const totalPrice = (participants.length * dates.length * trainer.hourlyRate);
  
      const booking = await Booking.create({
        userId,
        serviceId,
        trainerId,
        address,
        totalPrice
      });
  
      // Add participants
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
  
  // Edit a booking
  exports.editBooking = async (req, res) => {
    try {
      const { id } = req.params;
      const { address, participants, dates } = req.body;
  
      const booking = await Booking.findByPk(id);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
  
      booking.address = address || booking.address;
  
      // Update participants
      if (participants && participants.length > 0) {
        await Participant.destroy({ where: { bookingId: id } });
        const participantData = participants.map(participant => ({
          ...participant,
          bookingId: id
        }));
        await Participant.bulkCreate(participantData);
      }
  
      // Update dates
      if (dates && dates.length > 0) {
        await BookingDate.destroy({ where: { bookingId: id } });
        const dateData = dates.map(date => ({
          ...date,
          bookingId: id
        }));
        await BookingDate.bulkCreate(dateData);
      }
  
      await booking.save();
      res.status(200).json(booking);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  // Delete a booking
  exports.deleteBooking = async (req, res) => {
    try {
      const { id } = req.params;
  
      const booking = await Booking.findByPk(id);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
  
      await Participant.destroy({ where: { bookingId: id } });
      await BookingDate.destroy({ where: { bookingId: id } });
      await booking.destroy();
  
      res.status(200).json({ message: 'Booking deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };