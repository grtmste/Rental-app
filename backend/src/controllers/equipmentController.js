const pool = require('../config/database');
const QRCode = require('qrcode');

const getAll = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await pool.query(`
      SELECT
        e.*,
        c.name AS category_name,
        COALESCE(
          e.total_quantity - COALESCE(
            SUM(pe.quantity) FILTER (
              WHERE p.status IN ('confirmed', 'in_progress')
              AND p.start_date <= $1::date
              AND p.end_date >= $1::date
            ), 0
          ),
          e.total_quantity
        ) AS available_quantity
      FROM equipment e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN project_equipment pe ON e.id = pe.equipment_id
      LEFT JOIN projects p ON pe.project_id = p.id
      GROUP BY e.id, c.name
      ORDER BY e.name ASC
    `, [today]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const result = await pool.query(`
      SELECT
        e.*,
        c.name AS category_name,
        COALESCE(
          e.total_quantity - COALESCE(
            SUM(pe.quantity) FILTER (
              WHERE p.status IN ('confirmed', 'in_progress')
              AND p.start_date <= $2::date
              AND p.end_date >= $2::date
            ), 0
          ),
          e.total_quantity
        ) AS available_quantity
      FROM equipment e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN project_equipment pe ON e.id = pe.equipment_id
      LEFT JOIN projects p ON pe.project_id = p.id
      WHERE e.id = $1
      GROUP BY e.id, c.name
    `, [id, today]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const {
      name,
      category_id,
      total_quantity,
      condition,
      location,
      description,
      daily_rate,
      barcode,
    } = req.body;

    if (!name || !total_quantity) {
      return res.status(400).json({ error: 'Name and total_quantity are required.' });
    }

    const validConditions = ['excellent', 'good', 'fair', 'poor'];
    const itemCondition = validConditions.includes(condition) ? condition : 'good';

    const result = await pool.query(
      `INSERT INTO equipment (name, category_id, total_quantity, condition, location, description, daily_rate, barcode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, category_id || null, total_quantity, itemCondition, location || null, description || null, daily_rate || 0, barcode || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      category_id,
      total_quantity,
      condition,
      location,
      description,
      daily_rate,
      barcode,
    } = req.body;

    const existing = await pool.query('SELECT id FROM equipment WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }

    const result = await pool.query(
      `UPDATE equipment
       SET name = COALESCE($1, name),
           category_id = COALESCE($2, category_id),
           total_quantity = COALESCE($3, total_quantity),
           condition = COALESCE($4, condition),
           location = COALESCE($5, location),
           description = COALESCE($6, description),
           daily_rate = COALESCE($7, daily_rate),
           barcode = COALESCE($8, barcode)
       WHERE id = $9
       RETURNING *`,
      [name, category_id, total_quantity, condition, location, description, daily_rate, barcode, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM equipment WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }

    await pool.query('DELETE FROM equipment WHERE id = $1', [id]);
    res.json({ message: 'Equipment deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

const getQRCode = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM equipment WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }

    const equipment = result.rows[0];
    const qrData = JSON.stringify({
      id: equipment.id,
      name: equipment.name,
      barcode: equipment.barcode,
    });

    const qrCodeBase64 = await QRCode.toDataURL(qrData);
    res.json({ qrcode: qrCodeBase64, equipment_id: equipment.id, name: equipment.name });
  } catch (err) {
    next(err);
  }
};

const getLogs = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM equipment WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }

    const result = await pool.query(`
      SELECT
        el.*,
        u.name AS user_name,
        p.name AS project_name
      FROM equipment_logs el
      LEFT JOIN users u ON el.user_id = u.id
      LEFT JOIN projects p ON el.project_id = p.id
      WHERE el.equipment_id = $1
      ORDER BY el.created_at DESC
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const createLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { project_id, action, quantity, notes } = req.body;

    const existing = await pool.query('SELECT id FROM equipment WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }

    const validActions = ['check_in', 'check_out'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Action must be check_in or check_out.' });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1.' });
    }

    const result = await pool.query(
      `INSERT INTO equipment_logs (equipment_id, project_id, action, quantity, user_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, project_id || null, action, quantity, req.user.id, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getOne, create, update, remove, getQRCode, getLogs, createLog };
