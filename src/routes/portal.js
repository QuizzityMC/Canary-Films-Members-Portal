const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureApproved } = require('../middleware/auth');
const db = require('../models/database');

// Portal home
router.get('/', ensureAuthenticated, ensureApproved, async (req, res) => {
  try {
    // Get upcoming shoot schedules
    const schedules = await db.all(
      `SELECT s.*, COUNT(sa.id) as actor_count 
       FROM shoot_schedules s 
       LEFT JOIN schedule_actors sa ON s.id = sa.schedule_id 
       WHERE date >= date('now') 
       GROUP BY s.id 
       ORDER BY s.date, s.time 
       LIMIT 5`
    );

    // Get user's upcoming schedules
    const mySchedules = await db.all(
      `SELECT s.*, sa.character_name 
       FROM shoot_schedules s 
       JOIN schedule_actors sa ON s.id = sa.schedule_id 
       WHERE sa.user_id = ? AND s.date >= date('now')
       ORDER BY s.date, s.time`,
      [req.user.id]
    );

    res.render('portal/home', { 
      user: req.user, 
      schedules,
      mySchedules
    });
  } catch (err) {
    res.status(500).send('Error loading portal');
  }
});

// Shoot schedules
router.get('/schedules', ensureAuthenticated, ensureApproved, async (req, res) => {
  try {
    const schedules = await db.all(
      `SELECT s.*, GROUP_CONCAT(sa.character_name || ' (' || u.name || ')') as actors
       FROM shoot_schedules s
       LEFT JOIN schedule_actors sa ON s.id = sa.schedule_id
       LEFT JOIN users u ON sa.user_id = u.id
       GROUP BY s.id
       ORDER BY s.date DESC, s.time DESC`
    );

    res.render('portal/schedules', { user: req.user, schedules });
  } catch (err) {
    res.status(500).send('Error loading schedules');
  }
});

// Lines to learn
router.get('/lines', ensureAuthenticated, ensureApproved, async (req, res) => {
  try {
    const lines = await db.all(
      `SELECT l.*, s.date, s.time, s.location
       FROM lines_to_learn l
       JOIN shoot_schedules s ON l.schedule_id = s.id
       WHERE l.user_id = ? AND s.date >= date('now')
       ORDER BY s.date, s.time`,
      [req.user.id]
    );

    res.render('portal/lines', { user: req.user, lines });
  } catch (err) {
    res.status(500).send('Error loading lines');
  }
});

// Scripts
router.get('/scripts', ensureAuthenticated, ensureApproved, async (req, res) => {
  try {
    const scripts = await db.all(
      'SELECT id, title, version, created_at, updated_at FROM scripts ORDER BY updated_at DESC'
    );

    res.render('portal/scripts', { user: req.user, scripts });
  } catch (err) {
    res.status(500).send('Error loading scripts');
  }
});

// View script
router.get('/scripts/:id', ensureAuthenticated, ensureApproved, async (req, res) => {
  try {
    const script = await db.get('SELECT * FROM scripts WHERE id = ?', [req.params.id]);
    
    if (!script) {
      return res.status(404).send('Script not found');
    }

    res.render('portal/script-view', { user: req.user, script });
  } catch (err) {
    res.status(500).send('Error loading script');
  }
});

// Documents
router.get('/documents', ensureAuthenticated, ensureApproved, async (req, res) => {
  try {
    const documents = await db.all(
      `SELECT d.*, u.name as uploaded_by_name 
       FROM documents d 
       LEFT JOIN users u ON d.uploaded_by = u.id 
       ORDER BY d.created_at DESC`
    );

    res.render('portal/documents', { user: req.user, documents });
  } catch (err) {
    res.status(500).send('Error loading documents');
  }
});

module.exports = router;
