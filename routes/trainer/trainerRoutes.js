const express = require('express');
const router = express.Router();
const trainerController = require('../../controllers/trainer/trainerController');
const { authenticateJWT } = require('../../middleware/authMiddleware');


// Create a new trainer
router.post('/',authenticateJWT, trainerController.createTrainer);

// ✅ NEW: Full update (including services + images + details)
router.put('/:id/full', authenticateJWT, trainerController.updateTrainerFull);

// ✅ Get a trainer by userId
router.get('/user/:userId', trainerController.getTrainerByUserId);

router.get('/by-user/:userId', trainerController.findTrainerByUserId);


router.get('/:trainerId/bookings',  trainerController.getTrainerBookings);


router.patch('/:id/languages',      trainerController.updateTrainerLanguages);
router.patch('/:id/field-of-study', trainerController.updateTrainerFieldOfStudy);
router.patch('/:id/degree',         trainerController.updateTrainerDegree);
router.patch('/:id/tennis-cert',    trainerController.updateTrainerTennisCert);
router.patch('/:id/distance',       trainerController.updateTrainerDistance);

// Update a trainer
router.put('/:id', trainerController.updateTrainer);

// Delete a trainer
router.delete('/:id', trainerController.deleteTrainer);



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
