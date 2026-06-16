const pool = require('../config/database');
const { sendQuoteEmail } = require('../utils/emailService');

// Compute totals with equipment-only discount.
// equipmentSubtotal = sum(line_total where item_type='equipment')
// discountAmount = equipmentSubtotal * discount_pct/100
// serviceSubtotal = sum(line_total where item_type != 'equipment')
// subtotal = (equipmentSubtotal - discountAmount) + serviceSubtotal
function computeTotals(items, vatRate, discountPct) {
  let equipmentSubtotal = 0;
  let serviceSubtotal = 0;
  const processed = (items || []).map(item => {
    const lineTotal = parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0);
    const type = item.item_type || 'equipment';
    if (type === 'equipment') equipmentSubtotal += lineTotal;
    else serviceSubtotal += lineTotal;
    return { ...item, line_total: lineTotal, item_type: type };
  });
  const discountAmount = equipmentSubtotal * ((parseFloat(discountPct) || 0) / 100);
  const subtotal = (equipmentSubtotal - discountAmount) + serviceSubtotal;
  const vatAmount = subtotal * ((parseFloat(vatRate) || 0) / 100);
  const total = subtotal + vatAmount;
  return { processed, subtotal, vatAmount, total };
}

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
      SELECT q.*, c.name AS client_name, c.company AS client_company, c.email AS client_email, c.phone AS client_phone, c.address AS client_address,
             p.name AS project_name
      FROM quotes q
      LEFT JOIN clients c ON q.client_id = c.id
      LEFT JOIN projects p ON q.project_id = p.id
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

    // Fetch crew cost if quote is linked to a project
    if (quote.project_id) {
      const crewResult = await pool.query(
        `SELECT COALESCE(SUM(CASE WHEN pcm.hours > 0 THEN pcm.hours * pcm.rate_per_hour ELSE pcm.rate_per_hour END), 0) as total_cost,
                COALESCE(SUM(pcm.hours), 0) as total_hours,
                COUNT(pcm.id) as crew_count
         FROM project_crew_members pcm
         WHERE pcm.project_id = $1`,
        [quote.project_id]
      );
      quote.crew_cost = crewResult.rows[0];
    } else {
      quote.crew_cost = null;
    }

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
      discount_pct,
      items,
    } = req.body;
    let { event_name } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required.' });
    }

    await client.query('BEGIN');

    // Default event_name to project name when created from a project
    if (!event_name && project_id) {
      const projRes = await client.query('SELECT name FROM projects WHERE id = $1', [project_id]);
      if (projRes.rows.length > 0) event_name = projRes.rows[0].name;
    }

    // Generate quote number
    const countResult = await client.query('SELECT COUNT(*) FROM quotes');
    const quoteNumber = `Q-${new Date().getFullYear()}-${String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0')}`;

    const validStatuses = ['draft', 'sent', 'accepted', 'declined'];
    const quoteStatus = validStatuses.includes(status) ? status : 'draft';
    const vatRate = parseFloat(vat_rate) || 20;
    const discountPct = parseFloat(discount_pct) || 0;

    const { processed: processedItems, subtotal, vatAmount, total } = computeTotals(items, vatRate, discountPct);

    const quoteResult = await client.query(
      `INSERT INTO quotes (quote_number, project_id, client_id, status, date, due_date, notes, event_name, discount_pct, subtotal, vat_rate, vat_amount, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [quoteNumber, project_id || null, client_id, quoteStatus,
        date || new Date().toISOString().split('T')[0],
        due_date || null, notes || null, event_name || null, discountPct,
        subtotal, vatRate, vatAmount, total]
    );

    const quote = quoteResult.rows[0];

    for (const item of processedItems) {
      await client.query(
        `INSERT INTO quote_items (quote_id, description, quantity, unit_price, line_total, category_name, stage_name, item_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [quote.id, item.description, item.quantity || 1, item.unit_price || 0, item.line_total, item.category_name || null, item.stage_name || null, item.item_type || 'equipment']
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
      discount_pct,
      event_name,
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
    let vatRate = vat_rate !== undefined && vat_rate !== null ? parseFloat(vat_rate) : null;
    const discountPct = discount_pct !== undefined && discount_pct !== null ? parseFloat(discount_pct) : null;

    if (items !== undefined) {
      if (vatRate === null) {
        const currentQuote = await dbClient.query('SELECT vat_rate FROM quotes WHERE id = $1', [id]);
        vatRate = parseFloat(currentQuote.rows[0].vat_rate);
      }
      let effectiveDiscount = discountPct;
      if (effectiveDiscount === null) {
        const currentQuote = await dbClient.query('SELECT discount_pct FROM quotes WHERE id = $1', [id]);
        effectiveDiscount = parseFloat(currentQuote.rows[0].discount_pct) || 0;
      }
      const computed = computeTotals(items, vatRate, effectiveDiscount);
      subtotal = computed.subtotal;
      vatAmount = computed.vatAmount;
      total = computed.total;

      await dbClient.query('DELETE FROM quote_items WHERE quote_id = $1', [id]);
      for (const item of computed.processed) {
        await dbClient.query(
          `INSERT INTO quote_items (quote_id, description, quantity, unit_price, line_total, category_name, stage_name, item_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, item.description, item.quantity || 1, item.unit_price || 0, item.line_total, item.category_name || null, item.stage_name || null, item.item_type || 'equipment']
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
           total = COALESCE($10, total),
           discount_pct = COALESCE($11, discount_pct),
           event_name = COALESCE($12, event_name)
       WHERE id = $13
       RETURNING *`,
      [project_id, client_id, status, date, due_date, notes, subtotal, vatRate, vatAmount, total, discountPct, event_name !== undefined ? event_name : null, id]
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
    const { to, subject, message } = req.body;

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
    const recipientEmail = to || quote.client_email;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Saaja e-posti aadress puudub.' });
    }

    const client = { name: quote.client_name, email: recipientEmail };
    const emailResult = await sendQuoteEmail(quote, client, { subject, message });

    await pool.query('UPDATE quotes SET status = $1 WHERE id = $2', ['sent', id]);

    res.json({
      message: 'Pakkumine edukalt saadetud!',
      email: emailResult,
      quote_id: id,
      sent_to: recipientEmail,
      simulated: emailResult.simulated || false,
    });
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'EAUTH' || err.responseCode >= 400) {
      return res.status(502).json({ error: 'E-kirja saatmine ebaõnnestus. Palun kontrolli seadeid.' });
    }
    next(err);
  }
};

module.exports = { getAll, getOne, create, update, remove, send };
