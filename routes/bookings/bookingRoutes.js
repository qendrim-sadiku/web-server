const express = require('express');
const bookingController = require('../../controllers/booking/bookingController');
const router = express.Router();

router.post('/bookings', bookingController.createBooking);
// Group session booking route
router.post('/group-bookings', bookingController.createGroupSessionBooking);
router.get('/bookings/user/:userId', bookingController.getAllBookingsOfUser);

router.get('/bookings/user/:userId/paginated', bookingController.getUserBookingsWithPagination);

// Route to get all bookings of sub-users under a parent user
router.get('/bookings/sub-user/:parentUserId', bookingController.getSubUserBookings);

// e.g., GET /bookings/sub-user-by-ids/123?ids=5,6,7
router.get('/bookings/sub-user-by-ids/:parentUserId', bookingController.getSubUserBookingsByIds);


router.delete('/bookings/subuser-booking', bookingController.deleteSubUserBooking);


router.put('/bookings/approve-subuser/all', bookingController.approveAllSubUserBookings);

router.post('/bookings/subuser-booking', bookingController.createSubUserBooking);


router.put('/bookings/approve-subuser', bookingController.approveSubUserBooking);


router.get('/bookings/:id', bookingController.getBookingById);
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
