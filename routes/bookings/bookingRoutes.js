const express = require('express');
const bookingController = require('../../controllers/booking/bookingController');
const router = express.Router();

router.post('/bookings', bookingController.createBooking);
router.get('/bookings/user/:userId', bookingController.getAllBookingsOfUser);

router.get('/bookings/user/:userId/paginated', bookingController.getUserBookingsWithPagination);


router.get('/bookings/:id', bookingController.getBookingById);
// Route to get bookings by multiple IDs
// Route to fetch bookings by multiple IDs
router.get('/bookings', bookingController.getBookingsByIds);
router.put('/booking/:id', bookingController.editBooking);
router.put('/bookings/:id/cancel', bookingController.cancelBooking);
router.post('/bookings/:bookingId/rebook', bookingController.rebookService);
// Route to extend a session (modify only the end time)
router.put('/bookings/extend-session/:id', bookingController.extendSession);

router.get('/bookings/user/:userId/filter', bookingController.getFilteredBookingsOfUser);

router.get('/bookings/user/:userId/paginated-filter', bookingController.getPaginatedFilteredBookingsOfUser);

router.post('/bookings/user/:userId/dates', bookingController.getUserBookingsByDates);
// Route to get booking counts for multiple services
router.post('/bookings/counts', bookingController.getBookingCountsForServices);
// Route to remove a booking
router.delete('/bookings/:id', bookingController.removeBooking);
router.put('/bookings/rate/:id', bookingController.rateBooking);



module.exports = router;
