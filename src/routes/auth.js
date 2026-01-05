const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const bcrypt = require('bcryptjs');
const db = require('../models/database');

// Login page
router.get('/login', (req, res) => {
  res.render('auth/login', { 
    error: req.query.error,
    message: req.flash('error')
  });
});

// Login with email/password
router.post('/login', passport.authenticate('local', {
  successRedirect: '/portal',
  failureRedirect: '/auth/login?error=1',
  failureFlash: true
}));

// Hack Club OAuth
router.get('/hackclub', passport.authenticate('hackclub'));

router.get('/hackclub/callback', 
  passport.authenticate('hackclub', { 
    failureRedirect: '/auth/login?error=hackclub',
    failureFlash: true
  }),
  (req, res) => {
    res.redirect('/portal');
  }
);

// Google OAuth
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/auth/login?error=google',
    failureFlash: true
  }),
  (req, res) => {
    res.redirect('/portal');
  }
);

// Logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

// Pending approval page
router.get('/pending', (req, res) => {
  res.render('auth/pending');
});

module.exports = router;
