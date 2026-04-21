const pool = require('../config/database');
const { sendQuoteEmail } = require('../utils/emailService');

const getAll = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT q.*, c.name AS client_name, c.company AS client_company, c.email AS client_email,
             p.name AS project_name
      FROM quotes q
      LEFT JOIN clients c ON q.client_id = c.id
      LEFT JOIN projects p ON q.project_id = p.id
      ORDER BY q.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quoteResult = await pool.query(`
      SELECT q.*, c.name AS client_name, c.company AS client_company, c.email AS client_email, c.phone AS client_phone, c.address AS client_address
      FROM quotes q
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE q.id = $1
    `, [id]);

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found.' });
    }

    const itemsResult = await pool.query(
      'SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY id ASC',
      [id]
    );

    const quote = quoteResult.rows[0];
    quote.items = itemsResult.rows;

    res.json(quote);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      project_id,
      client_id,
      status,
      date,
      due_date,
      notes,
      vat_rate,
      items,
    } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required.' });
    }

    await client.query('BEGIN');

    // Generate quote number
    const countResult = await client.query('SELECT COUNT(*) FROM quotes');
    const quoteNumber = `Q-${new Date().getFullYear()}-${String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0')}`;

    const validStatuses = ['draft', 'sent', 'accepted', 'declined'];
    const quoteStatus = validStatuses.includes(status) ? status : 'draft';
    const vatRate = parseFloat(vat_rate) || 20;

    // Calculate totals from items
    let subtotal = 0;
    const processedItems = (items || []).map(item => {
      const lineTotal = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
      subtotal += lineTotal;
      return { ...item, line_total: lineTotal };
    });

    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;

    const quoteResult = await client.query(
      `INSERT INTO quotes (quote_number, project_id, client_id, status, date, due_date, notes, subtotal, vat_rate, vat_amount, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [quoteNumber, project_id || null, client_id, quoteStatus,
        date || new Date().toISOString().split('T')[0],
        due_date || null, notes || null,
        subtotal, vatRate, vatAmount, total]
    );

    const quote = quoteResult.rows[0];

    // Insert items
    for (const item of processedItems) {
      await client.query(
        `INSERT INTO quote_items (quote_id, description, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5)`,
        [quote.id, item.description, item.quantity || 1, item.unit_price || 0, item.line_total]
      );
    }

    await client.query('COMMIT');

    // Fetch full quote with items
    const fullItems = await pool.query('SELECT * FROM quote_items WHERE quote_id = $1', [quote.id]);
    quote.items = fullItems.rows;

    res.status(201).json(quote);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

const update = async (req, res, next) => {
  const dbClient = await pool.connect();
  try {
    const { id } = req.params;
    const {
      project_id,
      client_id,
      status,
      date,
      due_date,
      notes,
      vat_rate,
      items,
    } = req.body;

    const existing = await dbClient.query('SELECT id FROM quotes WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found.' });
    }

    await dbClient.query('BEGIN');

    // Recalculate totals if items provided
    let subtotal = null;
    let vatAmount = null;
    let total = null;
    let vatRate = vat_rate ? parseFloat(vat_rate) : null;

    if (items !== undefined) {
      subtotal = 0;
      const processedItems = (items || []).map(item => {
        const lineTotal = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
        subtotal += lineTotal;
        return { ...item, line_total: lineTotal };
      });

      if (vatRate === null) {
        const currentQuote = await dbClient.query('SELECT vat_rate FROM quotes WHERE id = $1', [id]);
        vatRate = parseFloat(currentQuote.rows[0].vat_rate);
      }
      vatAmount = subtotal * (vatRate / 100);
      total = subtotal + vatAmount;

      // Replace all items
      await dbClient.query('DELETE FROM quote_items WHERE quote_id = $1', [id]);
      for (const item of processedItems) {
        await dbClient.query(
          `INSERT INTO quote_items (quote_id, description, quantity, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, item.description, item.quantity || 1, item.unit_price || 0, item.line_total]
        );
      }
    }

    const quoteResult = await dbClient.query(
      `UPDATE quotes
       SET project_id = COALESCE($1, project_id),
           client_id = COALESCE($2, client_id),
           status = COALESCE($3, status),
           date = COALESCE($4, date),
           due_date = COALESCE($5, due_date),
           notes = COALESCE($6, notes),
           subtotal = COALESCE($7, subtotal),
           vat_rate = COALESCE($8, vat_rate),
           vat_amount = COALESCE($9, vat_amount),
           total = COALESCE($10, total)
       WHERE id = $11
       RETURNING *`,
      [project_id, client_id, status, date, due_date, notes, subtotal, vatRate, vatAmount, total, id]
    );

    await dbClient.query('COMMIT');

    const quote = quoteResult.rows[0];
    const itemsResult = await pool.query('SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY id ASC', [id]);
    quote.items = itemsResult.rows;

    res.json(quote);
  } catch (err) {
    await dbClient.query('ROLLBACK');
    next(err);
  } finally {
    dbClient.release();
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM quotes WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found.' });
    }

    await pool.query('DELETE FROM quotes WHERE id = $1', [id]);
    res.json({ message: 'Quote deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

const send = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quoteResult = await pool.query(`
      SELECT q.*, c.name AS client_name, c.email AS client_email, c.company AS client_company
      FROM quotes q
      JOIN clients c ON q.client_id = c.id
      WHERE q.id = $1
    `, [id]);

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found.' });
    }

    const quote = quoteResult.rows[0];

    if (!quote.client_email) {
      return res.status(400).json({ error: 'Client does not have an email address.' });
    }

    const client = { name: quote.client_name, email: quote.client_email };
    const emailResult = await sendQuoteEmail(quote, client);

    // Update status to 'sent'
    await pool.query('UPDATE quotes SET status = $1 WHERE id = $2', ['sent', id]);

    res.json({
      message: 'Quote sent successfully.',
      email: emailResult,
      quote_id: id,
      sent_to: quote.client_email,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getOne, create, update, remove, send };
