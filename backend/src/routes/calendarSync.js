const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { getSettings } = require('../utils/googleCalendar');

// GET /api/calendar-sync/settings
// Returns the calendar_settings row (creating a default if missing) +
// the list of users with their google_calendar_id.
router.get('/settings', auth, async (req, res, next) => {
  try {
    const settings = await getSettings();
    const users = await pool.query(
      'SELECT id, name, email, role, google_calendar_id FROM users ORDER BY name ASC'
    );
    res.json({ settings, users: users.rows });
  } catch (err) {
    next(err);
  }
});

// PUT /api/calendar-sync/settings  { master_calendar_id, enabled }
router.put('/settings', auth, async (req, res, next) => {
  try {
    const { master_calendar_id, enabled } = req.body;
    await getSettings(); // ensure row exists
    const result = await pool.query(
      `UPDATE calendar_settings
       SET master_calendar_id = COALESCE($1, master_calendar_id),
           enabled = COALESCE($2, enabled),
           updated_at = NOW()
       WHERE id = 1
       RETURNING *`,
      [master_calendar_id !== undefined ? master_calendar_id : null,
       enabled !== undefined ? enabled : null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/calendar-sync/members/:userId  { google_calendar_id }
router.put('/members/:userId', auth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { google_calendar_id } = req.body;
    const result = await pool.query(
      `UPDATE users SET google_calendar_id = $1 WHERE id = $2
       RETURNING id, name, email, role, google_calendar_id`,
      [google_calendar_id || null, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
