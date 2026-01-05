const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const OAuth2Strategy = require('passport-oauth2');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const db = require('../models/database');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Local Strategy (Email/Password)
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      
      if (!user) {
        return done(null, false, { message: 'User not found' });
      }

      if (!user.is_approved) {
        return done(null, false, { message: 'Account not approved by admin' });
      }

      if (!user.password_hash) {
        return done(null, false, { message: 'Please use OAuth to login' });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isValid) {
        return done(null, false, { message: 'Incorrect password' });
      }

      // Update last login
      await db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
      
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Hack Club OAuth Strategy
if (process.env.HACKCLUB_CLIENT_ID && process.env.HACKCLUB_CLIENT_SECRET) {
  passport.use('hackclub', new OAuth2Strategy(
    {
      authorizationURL: 'https://auth.hackclub.com/oauth/authorize',
      tokenURL: 'https://auth.hackclub.com/oauth/token',
      clientID: process.env.HACKCLUB_CLIENT_ID,
      clientSecret: process.env.HACKCLUB_CLIENT_SECRET,
      callbackURL: process.env.HACKCLUB_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Fetch user info from Hack Club API
        const axios = require('axios');
        const response = await axios.get('https://auth.hackclub.com/api/v1/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        const hackclubUser = response.data;
        
        // Check if user exists
        let user = await db.get('SELECT * FROM users WHERE hackclub_id = ?', [hackclubUser.id]);

        if (!user) {
          // Check if user needs to be pre-created by admin
          console.log(`[AUTH] Failed Hack Club login attempt - Account not found`);
          return done(null, false, { message: 'Account must be created by admin first' });
        }

        if (!user.is_approved) {
          console.log(`[AUTH] Failed Hack Club login attempt - Account not approved`);
          return done(null, false, { message: 'Account not approved by admin' });
        }

        // Update last login
        await db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));
}

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let user = await db.get('SELECT * FROM users WHERE google_id = ?', [profile.id]);

        if (!user) {
          // Check if user exists by email
          user = await db.get('SELECT * FROM users WHERE email = ?', [profile.emails[0].value]);
          
          if (!user) {
            console.log(`[AUTH] Failed Google login attempt - Account not found`);
            return done(null, false, { message: 'Account must be created by admin first' });
          }

          // Link Google ID to existing account
          await db.run('UPDATE users SET google_id = ? WHERE id = ?', [profile.id, user.id]);
        }

        if (!user.is_approved) {
          console.log(`[AUTH] Failed Google login attempt - Account not approved`);
          return done(null, false, { message: 'Account not approved by admin' });
        }

        // Update last login
        await db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));
}

module.exports = passport;
