const express = require('express');
const bookingController = require('../../controllers/booking/bookingController');
const router = express.Router();

router.post('/bookings', bookingController.createBooking);
router.get('/bookings/user/:userId', bookingController.getAllBookingsOfUser);
router.get('/bookings/:id', bookingController.getBookingById);
router.put('/booking/:id', bookingController.editBooking);
router.delete('/booking/:id', bookingController.deleteBooking);

module.exports = router;
