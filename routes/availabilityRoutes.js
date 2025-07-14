// routes/availabilityRoutes.js  (top level)
const router = require('express').Router();
const ctrl   = require('../controllers/availabilityController');
const { authenticateJWT } = require('../middleware/authMiddleware');

router.post  ('/trainers/:trainerId/availability',      authenticateJWT, ctrl.upsertSlots);
router.get   ('/trainers/:trainerId/availability',                              ctrl.getSlotsForDay);
router.delete('/trainers/:trainerId/availability/:id', authenticateJWT,  ctrl.deleteSlot);

// Example of the route definition
router.get('/trainers/:trainerId/available-slots', ctrl.getAvailableSlots);

module.exports = router;
 