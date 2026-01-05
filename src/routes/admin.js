const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const db = require('../models/database');

// Admin dashboard
router.get('/', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const users = await db.all('SELECT id, email, name, role, is_approved, created_at, last_login FROM users ORDER BY created_at DESC');
    res.render('admin/dashboard', { users, user: req.user });
  } catch (err) {
    res.status(500).send('Error loading admin dashboard');
  }
});

// Create user page
router.get('/users/create', ensureAuthenticated, ensureAdmin, (req, res) => {
  res.render('admin/create-user', { user: req.user, error: null, success: null });
});

// Create user
router.post('/users/create', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { email, name, password, role, is_approved } = req.body;
    
    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.render('admin/create-user', { 
        user: req.user, 
        error: 'User with this email already exists',
        success: null
      });
    }

    let passwordHash = null;
    if (password && password.trim() !== '') {
      passwordHash = await bcrypt.hash(password, 10);
    }

    await db.run(
      'INSERT INTO users (email, password_hash, name, role, is_approved) VALUES (?, ?, ?, ?, ?)',
      [email, passwordHash, name, role || 'member', is_approved ? 1 : 0]
    );

    res.render('admin/create-user', { 
      user: req.user, 
      error: null,
      success: 'User created successfully'
    });
  } catch (err) {
    res.render('admin/create-user', { 
      user: req.user, 
      error: 'Error creating user: ' + err.message,
      success: null
    });
  }
});

// Approve user
router.post('/users/:id/approve', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    await db.run('UPDATE users SET is_approved = 1 WHERE id = ?', [req.params.id]);
    res.redirect('/admin');
  } catch (err) {
    res.status(500).send('Error approving user');
  }
});

// Revoke approval
router.post('/users/:id/revoke', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    await db.run('UPDATE users SET is_approved = 0 WHERE id = ?', [req.params.id]);
    res.redirect('/admin');
  } catch (err) {
    res.status(500).send('Error revoking user approval');
  }
});

// Delete user
router.post('/users/:id/delete', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    await db.run('DELETE FROM users WHERE id = ? AND role != ?', [req.params.id, 'admin']);
    res.redirect('/admin');
  } catch (err) {
    res.status(500).send('Error deleting user');
  }
});

module.exports = router;
