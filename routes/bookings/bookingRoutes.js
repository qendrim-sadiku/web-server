const express = require('express');
const bookingController = require('../../controllers/booking/bookingController');
const router = express.Router();

router.post('/bookings', bookingController.createBooking);
router.get('/bookings/user/:userId', bookingController.getAllBookingsOfUser);
router.get('/bookings/:id', bookingController.getBookingById);
router.put('/booking/:id', bookingController.editBooking);
router.put('/bookings/:id/cancel', bookingController.cancelBooking);
router.post('/bookings/:bookingId/rebook', bookingController.rebookService);
// Route to extend a session (modify only the end time)
router.put('/bookings/extend-session/:id', bookingController.extendSession);

router.get('/bookings/user/:userId/filter', bookingController.getFilteredBookingsOfUser);
router.post('/bookings/user/:userId/dates', bookingController.getUserBookingsByDates);


module.exports = router;
