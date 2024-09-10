// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('passport'); // Import passport


router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/change-password/:userId', authController.changePassword);

// Route to start Facebook OAuth authentication
router.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

// Callback route after Facebook has authenticated the user
router.get('/auth/facebook/callback', passport.authenticate('facebook', { session: false }), (req, res) => {
  const { user, token } = req.user;
  res.status(200).json({
    message: 'Facebook login successful',
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role }
  });
});

// Route to start Google OAuth authentication
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback route after Google has authenticated the user
router.get('/auth/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
  const { user, token } = req.user;
  res.status(200).json({
    message: 'Google login successful',
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role }
  });
});


module.exports = router;
