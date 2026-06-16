const pool = require('../config/database');
const { sendInvoiceEmail } = require('../utils/emailService');

// Compute totals with equipment-only discount (same formula as quotes).
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
      SELECT i.*, c.name AS client_name, c.company AS client_company, c.email AS client_email,
             p.name AS project_name
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN projects p ON i.project_id = p.id
      ORDER BY i.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoiceResult = await pool.query(`
      SELECT i.*, c.name AS client_name, c.company AS client_company, c.email AS client_email, c.phone AS client_phone, c.address AS client_address,
             p.name AS project_name
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN projects p ON i.project_id = p.id
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const itemsResult = await pool.query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC',
      [id]
    );

    const invoice = invoiceResult.rows[0];
    invoice.items = itemsResult.rows;

    res.json(invoice);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  const dbClient = await pool.connect();
  try {
    const {
      project_id,
      client_id,
      quote_id,
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

    await dbClient.query('BEGIN');

    // Default event_name to project name when created from a project
    if (!event_name && project_id) {
      const projRes = await dbClient.query('SELECT name FROM projects WHERE id = $1', [project_id]);
      if (projRes.rows.length > 0) event_name = projRes.rows[0].name;
    }

    // Generate invoice number
    const countResult = await dbClient.query('SELECT COUNT(*) FROM invoices');
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0')}`;

    const validStatuses = ['draft', 'sent', 'paid', 'overdue'];
    const invoiceStatus = validStatuses.includes(status) ? status : 'draft';
    const vatRate = parseFloat(vat_rate) || 20;
    const discountPct = parseFloat(discount_pct) || 0;

    const { processed: processedItems, subtotal, vatAmount, total } = computeTotals(items, vatRate, discountPct);

    const invoiceResult = await dbClient.query(
      `INSERT INTO invoices (invoice_number, project_id, client_id, quote_id, status, date, due_date, notes, event_name, discount_pct, subtotal, vat_rate, vat_amount, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [invoiceNumber, project_id || null, client_id, quote_id || null, invoiceStatus,
        date || new Date().toISOString().split('T')[0],
        due_date || null, notes || null, event_name || null, discountPct,
        subtotal, vatRate, vatAmount, total]
    );

    const invoice = invoiceResult.rows[0];

    for (const item of processedItems) {
      await dbClient.query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, line_total, category_name, stage_name, item_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [invoice.id, item.description, item.quantity || 1, item.unit_price || 0, item.line_total,
         item.category_name || null, item.stage_name || null, item.item_type || 'equipment']
      );
    }

    await dbClient.query('COMMIT');

    const fullItems = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoice.id]);
    invoice.items = fullItems.rows;

    res.status(201).json(invoice);
  } catch (err) {
    await dbClient.query('ROLLBACK');
    next(err);
  } finally {
    dbClient.release();
  }
};

const update = async (req, res, next) => {
  const dbClient = await pool.connect();
  try {
    const { id } = req.params;
    const {
      project_id,
      client_id,
      quote_id,
      status,
      date,
      due_date,
      notes,
      vat_rate,
      discount_pct,
      event_name,
      items,
    } = req.body;

    const existing = await dbClient.query('SELECT id FROM invoices WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    await dbClient.query('BEGIN');

    let subtotal = null;
    let vatAmount = null;
    let total = null;
    let vatRate = vat_rate !== undefined && vat_rate !== null ? parseFloat(vat_rate) : null;
    const discountPct = discount_pct !== undefined && discount_pct !== null ? parseFloat(discount_pct) : null;

    if (items !== undefined) {
      if (vatRate === null) {
        const currentInvoice = await dbClient.query('SELECT vat_rate FROM invoices WHERE id = $1', [id]);
        vatRate = parseFloat(currentInvoice.rows[0].vat_rate);
      }
      let effectiveDiscount = discountPct;
      if (effectiveDiscount === null) {
        const currentInvoice = await dbClient.query('SELECT discount_pct FROM invoices WHERE id = $1', [id]);
        effectiveDiscount = parseFloat(currentInvoice.rows[0].discount_pct) || 0;
      }
      const computed = computeTotals(items, vatRate, effectiveDiscount);
      subtotal = computed.subtotal;
      vatAmount = computed.vatAmount;
      total = computed.total;

      await dbClient.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
      for (const item of computed.processed) {
        await dbClient.query(
          `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, line_total, category_name, stage_name, item_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, item.description, item.quantity || 1, item.unit_price || 0, item.line_total,
           item.category_name || null, item.stage_name || null, item.item_type || 'equipment']
        );
      }
    }

    const invoiceResult = await dbClient.query(
      `UPDATE invoices
       SET project_id = COALESCE($1, project_id),
           client_id = COALESCE($2, client_id),
           quote_id = COALESCE($3, quote_id),
           status = COALESCE($4, status),
           date = COALESCE($5, date),
           due_date = COALESCE($6, due_date),
           notes = COALESCE($7, notes),
           subtotal = COALESCE($8, subtotal),
           vat_rate = COALESCE($9, vat_rate),
           vat_amount = COALESCE($10, vat_amount),
           total = COALESCE($11, total),
           discount_pct = COALESCE($12, discount_pct),
           event_name = COALESCE($13, event_name)
       WHERE id = $14
       RETURNING *`,
      [project_id, client_id, quote_id, status, date, due_date, notes, subtotal, vatRate, vatAmount, total, discountPct, event_name !== undefined ? event_name : null, id]
    );

    await dbClient.query('COMMIT');

    const invoice = invoiceResult.rows[0];
    const itemsResult = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC', [id]);
    invoice.items = itemsResult.rows;

    res.json(invoice);
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

    const existing = await pool.query('SELECT id FROM invoices WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    await pool.query('DELETE FROM invoices WHERE id = $1', [id]);
    res.json({ message: 'Invoice deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

const send = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoiceResult = await pool.query(`
      SELECT i.*, c.name AS client_name, c.email AS client_email, c.company AS client_company
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const invoice = invoiceResult.rows[0];

    if (!invoice.client_email) {
      return res.status(400).json({ error: 'Client does not have an email address.' });
    }

    const client = { name: invoice.client_name, email: invoice.client_email };
    const emailResult = await sendInvoiceEmail(invoice, client);

    await pool.query('UPDATE invoices SET status = $1 WHERE id = $2', ['sent', id]);

    res.json({
      message: 'Invoice sent successfully.',
      email: emailResult,
      invoice_id: id,
      sent_to: invoice.client_email,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getOne, create, update, remove, send };
