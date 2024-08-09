// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const verifyAdmin= require('../middleware/authMiddleware');
const authenticateJWT = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');
const multer = require('multer');


// Example route to create a user with role restriction
router.post('/create', verifyAdmin, userController.createUser);


// Fetch all users (restricted to admins)
router.get('/all', verifyAdmin, userController.getAllUsers);


// Route for creating or updating user profile
router.post('/profile', authenticateJWT, userController.updateProfile);

// Route for fetching user profile by userId
router.get('/profile/:userId',  userController.getProfile);

// Route for fetching user profile by userId
router.put('/profile/:userId',  userController.updateProfile);

// Route for creating or updating user profile
router.post('/verify',  userController.verifyCurrentPassword);

// Route for creating or updating user profile
router.put('/change-password',  userController.updatePassword);

// // Update contact details
router.put('/update-contact-details', userController.updateContactDetails);

// // Update address
router.put('/update-address', userController.updateAddress);

// // Update meeting points
router.put('/update-meeting-points', userController.updateMeetingPoints);

// // Update user details
router.put('/update-user-details', userController.updateUserDetails);

// // Update payment info
router.put('/update-payment-info', userController.updatePaymentInfo);

router.put('/user-info', userController.updateUserInfo);

router.get('/user/:userId', userController.getUser);
router.get('/user/:userId/address', userController.getUserAddress);
router.get('/user/:userId/contact-details', userController.getUserContactDetails);
router.get('/user/:userId/meeting-point', userController.getMeetingPoints);
router.get('/user/:userId/details', userController.getUserDetails);
router.get('/user/:userId/payment-info', userController.getUserPaymentInfo);

router.get('/user/:userId/avatar', userController.getUserAvatar);
router.put('/user/:userId/avatar', userController.updateUserAvatar);

router.delete('/user/:userId/avatar', userController.removeUserAvatar);

// Route to update user preferences
router.put('/user/:userId/preferences', userController.updateUserPreferences);

// Route to get user preferences
router.get('/user/:userId/preferences', userController.getUserPreferences);

// Route to get specializations and expertise levels
router.get('/specializations-expertise', userController.getSpecializationsAndExpertise);

module.exports = router;
