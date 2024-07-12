// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const verifyAdmin= require('../middleware/authMiddleware');
const authenticateJWT = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

// Example route to create a user with role restriction
router.post('/create', verifyAdmin, userController.createUser);


// Fetch all users (restricted to admins)
router.get('/all', verifyAdmin, userController.getAllUsers);


// Route for creating or updating user profile
router.post('/profile', authenticateJWT, userController.updateProfile);

// Route for fetching user profile by userId
router.get('/profile/:userId', authenticateJWT, userController.getProfile);




module.exports = router;
