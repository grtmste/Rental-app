const pool = require('../config/database');

const getAll = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(e.id)::int AS equipment_count
      FROM categories c
      LEFT JOIN equipment e ON e.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required.' });
    const result = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required.' });
    const existing = await pool.query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Category not found.' });
    const result = await pool.query(
      'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reassign_to } = req.body;
    const existing = await pool.query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Category not found.' });
    if (reassign_to) {
      await pool.query('UPDATE equipment SET category_id = $1 WHERE category_id = $2', [reassign_to, id]);
    }
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ message: 'Category deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, create, update, remove };
