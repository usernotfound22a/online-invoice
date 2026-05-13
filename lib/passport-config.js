// lib/passport-config.js - Google OAuth Strategy
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Business = require('../models/Business');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let business = await Business.findOne({ email: profile.emails[0].value });
      
      if (business) {
        // User exists, return business
        return done(null, business);
      }
      
      // Create new business from Google profile
      business = new Business({
        business_name: profile.displayName,
        email: profile.emails[0].value,
        password: 'oauth_google_' + profile.id, // Dummy password for OAuth users
        is_admin: false,
        created_at: new Date()
      });
      
      await business.save();
      return done(null, business);
    } catch (err) {
      return done(err, null);
    }
  }
));

// Serialize user to session
passport.serializeUser((business, done) => {
  done(null, business._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const business = await Business.findById(id);
    done(null, business);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
