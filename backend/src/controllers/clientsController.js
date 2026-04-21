const pool = require('../config/database');

const getAll = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM clients ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;

    const clientResult = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const client = clientResult.rows[0];

    // Fetch booking history (projects)
    const projectsResult = await pool.query(`
      SELECT id, name, status, start_date, end_date, budget, description, created_at
      FROM projects
      WHERE client_id = $1
      ORDER BY created_at DESC
    `, [id]);

    // Fetch quotes
    const quotesResult = await pool.query(`
      SELECT id, quote_number, status, date, due_date, total, created_at
      FROM quotes
      WHERE client_id = $1
      ORDER BY created_at DESC
    `, [id]);

    // Fetch invoices
    const invoicesResult = await pool.query(`
      SELECT id, invoice_number, status, date, due_date, total, created_at
      FROM invoices
      WHERE client_id = $1
      ORDER BY created_at DESC
    `, [id]);

    client.projects = projectsResult.rows;
    client.quotes = quotesResult.rows;
    client.invoices = invoicesResult.rows;

    res.json(client);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, company, email, phone, address, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Client name is required.' });
    }

    const result = await pool.query(
      `INSERT INTO clients (name, company, email, phone, address, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, company || null, email || null, phone || null, address || null, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, company, email, phone, address, notes } = req.body;

    const existing = await pool.query('SELECT id FROM clients WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const result = await pool.query(
      `UPDATE clients
       SET name = COALESCE($1, name),
           company = COALESCE($2, company),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           address = COALESCE($5, address),
           notes = COALESCE($6, notes)
       WHERE id = $7
       RETURNING *`,
      [name, company, email, phone, address, notes, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM clients WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    await pool.query('DELETE FROM clients WHERE id = $1', [id]);
    res.json({ message: 'Client deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

const getCommunications = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM clients WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const result = await pool.query(`
      SELECT cl.*, u.name AS user_name
      FROM communication_logs cl
      LEFT JOIN users u ON cl.user_id = u.id
      WHERE cl.client_id = $1
      ORDER BY cl.created_at DESC
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const addCommunication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, subject, message } = req.body;

    const existing = await pool.query('SELECT id FROM clients WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    if (!type || !message) {
      return res.status(400).json({ error: 'Type and message are required.' });
    }

    const result = await pool.query(
      `INSERT INTO communication_logs (client_id, user_id, type, subject, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, req.user.id, type, subject || null, message]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getOne, create, update, remove, getCommunications, addCommunication };
