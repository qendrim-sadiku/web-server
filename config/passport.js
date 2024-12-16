const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User'); // Import User model

// Serialize user to save into session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL}/auth/google/callback`, // Use dynamic callback URL from environment variable
      passReqToCallback: true, // Allows us to pass back the entire request to the callback
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Extract isSignUp from state parameter
        const state = JSON.parse(req.query.state || '{}');
        const isSignUp = state.isSignUp === 'true';

        const email = profile.emails[0].value;
        let user = await User.findOne({ where: { email } });

        if (isSignUp) {
          if (user) {
            // User exists, cannot sign up
            return done(null, false, { message: 'This user has already signed up. Do you want to log in?' });
          } else {
            // Create new user
            const newUser = await User.create({
              name: profile.displayName,
              email,
              provider: 'google',
              providerId: profile.id,
            });
            return done(null, newUser);
          }
        } else {
          if (user) {
            // User exists, proceed to login
            return done(null, user);
          } else {
            // User doesn't exist, cannot log in
            return done(null, false, { message: 'User not found. Do you want to sign up?' });
          }
        }
      } catch (err) {
        console.error('OAuth Error:', err);
        return done(err, null);
      }
    }
  )
);

// Facebook Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL}/auth/facebook/callback`, // Use dynamic callback URL from environment variable
      profileFields: ['id', 'emails', 'name'], // Ensure 'emails' is included
      passReqToCallback: true, // Allows us to pass back the entire request to the callback
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Extract isSignUp from state parameter
        const state = JSON.parse(req.query.state || '{}');
        const isSignUp = state.isSignUp === 'true';

        const email = profile.emails ? profile.emails[0].value : null;
        const name = `${profile.name.givenName} ${profile.name.familyName}`;

        let user = await User.findOne({ where: { email } });

        if (isSignUp) {
          if (user) {
            // User exists, cannot sign up
            return done(null, false, { message: 'This user has already signed up. Do you want to log in?' });
          } else {
            // Create new user
            const newUser = await User.create({
              name,
              email,
              provider: 'facebook',
              providerId: profile.id,
            });
            return done(null, newUser);
          }
        } else {
          if (user) {
            // User exists, proceed to login
            return done(null, user);
          } else {
            // User doesn't exist, cannot log in
            return done(null, false, { message: 'User not found. Do you want to sign up?' });
          }
        }
      } catch (err) {
        console.error('Facebook OAuth Error:', err);
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
