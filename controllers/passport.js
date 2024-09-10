const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Assuming you have a User model

// Facebook OAuth Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: "/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'email'],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if the user already exists in the database
      let user = await User.findOne({ where: { facebookId: profile.id } });

      if (!user) {
        // Create a new user if one doesn't exist
        user = await User.create({
          facebookId: profile.id,
          username: profile.displayName,
          email: profile.emails && profile.emails[0] ? profile.emails[0].value : null
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return done(null, { user, token }); // Return user and token
    } catch (error) {
      return done(error, null);
    }
  }
));

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if the user already exists in the database
      let user = await User.findOne({ where: { googleId: profile.id } });

      if (!user) {
        // Create a new user if one doesn't exist
        user = await User.create({
          googleId: profile.id,
          username: profile.displayName,
          email: profile.emails && profile.emails[0] ? profile.emails[0].value : null
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return done(null, { user, token }); // Return user and token
    } catch (error) {
      return done(error, null);
    }
  }
));

// Serialize user into the session
passport.serializeUser((data, done) => {
  done(null, data);
});

// Deserialize user from the session
passport.deserializeUser((data, done) => {
  done(null, data);
});

module.exports = passport;
