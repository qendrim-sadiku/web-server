const express = require('express');
const router = express.Router();
const { authenticateJWT, verifyAdmin } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

// Example route to create a user with role restriction (admin only)
router.post('/create', verifyAdmin, userController.createUser);

// Fetch all users (restricted to admins)
router.get('/all', verifyAdmin, userController.getAllUsers);

// Route for creating or updating user profile (authenticated users only)
router.post('/profile', authenticateJWT, userController.updateProfile);

// Route for fetching user profile by userId (authenticated users only)
router.get('/profile/:userId', authenticateJWT, userController.getProfile);

// Route for updating user profile by userId (authenticated users only)
router.put('/profile/:userId', authenticateJWT, userController.updateProfile);

// Route to verify current password (authenticated users only)
router.post('/verify', authenticateJWT, userController.verifyCurrentPassword);

// Route for updating password (authenticated users only)
router.put('/change-password', authenticateJWT, userController.updatePassword);

// Update contact details (authenticated users only)
router.put('/update-contact-details', authenticateJWT, userController.updateContactDetails);

// Update address (authenticated users only)
router.put('/update-address', authenticateJWT, userController.updateAddress);

// Update meeting points (authenticated users only)
router.put('/update-meeting-points', authenticateJWT, userController.updateMeetingPoints);

// Update user details (authenticated users only)
router.put('/update-user-details', authenticateJWT, userController.updateUserDetails);

// Update payment info (authenticated users only)
router.put('/update-payment-info', authenticateJWT, userController.updatePaymentInfo);

// Update user info (authenticated users only)
router.put('/user-info', authenticateJWT, userController.updateUserInfo);

// Get user details by userId (authenticated users only)
router.get('/user/:userId', authenticateJWT, userController.getUser);
router.get('/user/:userId/address', authenticateJWT, userController.getUserAddress);
router.get('/user/:userId/contact-details', authenticateJWT, userController.getUserContactDetails);
router.get('/user/:userId/meeting-point', authenticateJWT, userController.getMeetingPoints);
router.get('/user/:userId/details', authenticateJWT, userController.getUserDetails);
router.get('/user/:userId/payment-info', authenticateJWT, userController.getUserPaymentInfo);

// Handle user avatar (authenticated users only)
router.get('/user/:userId/avatar', authenticateJWT, userController.getUserAvatar);
router.put('/user/:userId/avatar', authenticateJWT, userController.updateUserAvatar);
router.delete('/user/:userId/avatar', authenticateJWT, userController.removeUserAvatar);

// Route to update user preferences (authenticated users only)
router.put('/user/:userId/preferences', authenticateJWT, userController.updateUserPreferences);

// Route to get user preferences (authenticated users only)
router.get('/user/:userId/preferences', authenticateJWT, userController.getUserPreferences);

// Route to get specializations and expertise levels (public route, no authentication)
router.get('/specializations-expertise', userController.getSpecializationsAndExpertise);

module.exports = router;
