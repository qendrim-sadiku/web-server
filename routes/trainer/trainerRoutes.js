const express = require('express');
const router = express.Router();
const trainerController = require('../../controllers/trainer/trainerController');

// Create a new trainer
router.post('/', trainerController.createTrainer);

// Get all trainers by category
router.get('/category/:categoryId', trainerController.getTrainersByCategory);

// Get a single trainer by ID
router.get('/:id', trainerController.getTrainerById);

// Get all trainers with ratings and bookings
router.get('/', trainerController.getAllTrainers);

// Get detailed information about a single trainer (bookings, reviews, availability)
router.get('/details/:id', trainerController.getTrainerDetails);

router.post('/trainer/:trainerId/review', trainerController.addReview);
// New route for checking trainer availability
router.get('/availability/:id', trainerController.getTrainerAvailability);

router.get('/:trainerId/bookings-count', trainerController.getTrainerBookingsCount);

// Route for checking availability of multiple trainers
router.post('/availability/multiple', trainerController.getMultipleTrainersAvailability);




module.exports = router;
