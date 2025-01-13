// routes/groupSessions.js

const express = require('express');
const router = express.Router();
const groupSessionController = require('../controllers/groupSessionController');

// ========== Trainer or admin endpoints ==========
router.post('/', groupSessionController.createGroupSession);        // Create a group session
router.put('/:id', groupSessionController.updateGroupSession);      // Update group session
router.delete('/:id', groupSessionController.deleteGroupSession);   // Delete group session

// New filter route
router.get('/filter', groupSessionController.getFilteredGroupSessions);

router.get('/service/:serviceId/filter', groupSessionController.getFilteredGroupSessionsForService);


// ========== Public endpoints ==========
router.get('/', groupSessionController.getAllGroupSessions);        // Get all group sessions
router.get('/:id', groupSessionController.getGroupSessionById);     // Get single group session by ID

// ========== Service-specific ==========
router.get('/service/:serviceId', groupSessionController.getGroupSessionsForService);

// ========== User actions ==========
router.post('/:groupSessionId/join', groupSessionController.joinGroupSession);
router.delete('/booking/:bookingId', groupSessionController.cancelGroupBooking);

module.exports = router;
