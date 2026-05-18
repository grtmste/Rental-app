const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

// GET /api/project-statuses - list all
router.get('/', auth, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM project_statuses ORDER BY sort_order ASC, id ASC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/project-statuses - add new
router.post('/', auth, async (req, res, next) => {
  try {
    const { key, label, color, sort_order } = req.body;
    if (!key || !label) return res.status(400).json({ error: 'key and label are required' });

    const result = await pool.query(
      `INSERT INTO project_statuses (key, label, color, sort_order, is_default)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [key, label, color || 'gray', sort_order || 99]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Status key already exists' });
    next(err);
  }
});

// PUT /api/project-statuses/:id - update label/color
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { label, color, sort_order } = req.body;

    const result = await pool.query(
      `UPDATE project_statuses
       SET label = COALESCE($1, label),
           color = COALESCE($2, color),
           sort_order = COALESCE($3, sort_order)
       WHERE id = $4
       RETURNING *`,
      [label, color, sort_order, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Status not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/project-statuses/:id - remove (only non-default)
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM project_statuses WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Status not found' });
    if (existing.rows[0].is_default) return res.status(400).json({ error: 'Cannot delete default statuses' });

    await pool.query('DELETE FROM project_statuses WHERE id = $1', [id]);
    res.json({ message: 'Status deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
