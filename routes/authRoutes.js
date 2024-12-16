const express = require('express');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken

const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('../config/passport');


const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/change-password/:userId', authController.changePassword);

router.post('/auth/signup', authController.signup);
router.post('/auth/signin', authController.signin);
router.post('/auth/verify-code', authController.verifyCode);
router.post('/auth/resend-code', authController.resendVerificationCode);


// Google Authentication - Redirect to Google's OAuth 2.0 page
// router.get(
//   '/auth/google',
//   passport.authenticate('google', {
//     scope: ['profile', 'email'], // Request profile and email access
//   })
// );

// router.get(
//   '/auth/google/callback',
//   passport.authenticate('google', { failureRedirect: '/login' }),
//   async (req, res) => {
//     try {
//       const token = jwt.sign(
//         { id: req.user.id, email: req.user.email, role: req.user.role },
//         process.env.JWT_SECRET,
//         { expiresIn: '7d' }
//       );

//       const user = {
//         id: req.user.id,
//         email: req.user.email,
//         name: req.user.name,
//         role: req.user.role
//       };

//       // Base64 encode the user details
//       const userBase64 = Buffer.from(JSON.stringify(user)).toString('base64');

//       const frontendUrl = 'http://localhost:4200';
//       res.redirect(`${frontendUrl}/welcome?token=${token}&user=${userBase64}`);
//     } catch (err) {
//       console.error('Error during Google callback:', err.message);
//       res.status(500).json({ error: 'Internal server error during authentication' });
//     }
//   }
// );



// Facebook Authentication - Redirect to Facebook's OAuth page
// router.get(
//     '/auth/facebook',
//     passport.authenticate('facebook', {
//       scope: ['email'], // Request email access
//     })
//   );
  
// // Facebook Authentication Callback - Handle Facebook's response
// router.get(
//   '/auth/facebook/callback',
//   passport.authenticate('facebook', { failureRedirect: '/login' }), // Redirect on failure
//   async (req, res) => {
//     try {
//       // Generate JWT token for the authenticated user
//       const token = jwt.sign(
//         {
//           id: req.user.id,
//           email: req.user.email,
//           role: req.user.role,
//         },
//         process.env.JWT_SECRET,
//         { expiresIn: '7d' } // Token validity: 7 days
//       );

//       // Prepare user data for frontend
//       const user = {
//         id: req.user.id,
//         name: req.user.name,
//         email: req.user.email,
//         role: req.user.role,
//       };

//       // Base64 encode the user details
//       const userBase64 = Buffer.from(JSON.stringify(user)).toString('base64');

//       // Redirect to frontend with token and user data
//       const frontendUrl = 'http://localhost:4200'; // Replace with your frontend base URL
//       res.redirect(`${frontendUrl}/welcome?token=${token}&user=${userBase64}`);
//     } catch (err) {
//       console.error('Error during Facebook callback:', err.message);
//       res.status(500).json({ error: 'Internal server error during authentication' });
//     }
//   }
// );

// routes/auth.js

// Google Authentication Route
router.get('/auth/google', (req, res, next) => {
  const isSignUp = req.query.isSignUp;
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: JSON.stringify({ isSignUp })
  })(req, res, next);
});

// Google Authentication Callback
router.get('/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(info.message)}`);
    } else {
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };

      const userBase64 = Buffer.from(JSON.stringify(userData)).toString('base64');
      res.redirect(`${FRONTEND_URL}/welcome?token=${token}&user=${userBase64}`);
    }
  })(req, res, next);
});

// Facebook Authentication Route
router.get('/auth/facebook', (req, res, next) => {
  const isSignUp = req.query.isSignUp;
  passport.authenticate('facebook', {
    scope: ['email'],
    state: JSON.stringify({ isSignUp })
  })(req, res, next);
});

// Facebook Authentication Callback
router.get('/auth/facebook/callback', (req, res, next) => {
  passport.authenticate('facebook', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(info.message)}`);
    } else {
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };

      const userBase64 = Buffer.from(JSON.stringify(userData)).toString('base64');
      res.redirect(`${FRONTEND_URL}/welcome?token=${token}&user=${userBase64}`);
    }
  })(req, res, next);
});

  
  

module.exports = router;
