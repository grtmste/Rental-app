const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

// GET /api/inventory/availability?date=YYYY-MM-DD
router.get('/availability', auth, async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT e.id as equipment_id, e.name, c.name as category_name,
             e.total_quantity,
             COALESCE(SUM(pe.quantity) FILTER (
               WHERE p.status IN ('confirmed', 'in_progress')
               AND p.start_date <= $1::date
               AND p.end_date >= $1::date
             ), 0) as booked_qty,
             e.total_quantity - COALESCE(SUM(pe.quantity) FILTER (
               WHERE p.status IN ('confirmed', 'in_progress')
               AND p.start_date <= $1::date
               AND p.end_date >= $1::date
             ), 0) as available_qty
      FROM equipment e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN project_equipment pe ON e.id = pe.equipment_id
      LEFT JOIN projects p ON pe.project_id = p.id
      GROUP BY e.id, e.name, c.name, e.total_quantity
      ORDER BY c.name NULLS LAST, e.name
    `, [date]);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
