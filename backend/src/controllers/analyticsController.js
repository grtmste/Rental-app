const pool = require('../config/database');

const overview = async (req, res, next) => {
  try {
    // Total bookings (projects)
    const bookingsResult = await pool.query('SELECT COUNT(*) AS total_bookings FROM projects');

    // Revenue: sum of paid invoices
    const revenueResult = await pool.query(`
      SELECT COALESCE(SUM(total), 0) AS total_revenue
      FROM invoices
      WHERE status = 'paid'
    `);

    // Active projects
    const activeResult = await pool.query(`
      SELECT COUNT(*) AS active_projects
      FROM projects
      WHERE status IN ('confirmed', 'in_progress')
    `);

    // Equipment utilization: percentage of equipment items that are currently in active projects
    const utilizationResult = await pool.query(`
      SELECT
        COUNT(DISTINCT e.id) AS total_equipment,
        COUNT(DISTINCT pe.equipment_id) AS utilized_equipment
      FROM equipment e
      LEFT JOIN project_equipment pe ON e.id = pe.equipment_id
      LEFT JOIN projects p ON pe.project_id = p.id AND p.status IN ('confirmed', 'in_progress')
    `);

    const totalEquipment = parseInt(utilizationResult.rows[0].total_equipment) || 0;
    const utilizedEquipment = parseInt(utilizationResult.rows[0].utilized_equipment) || 0;
    const utilizationRate = totalEquipment > 0 ? Math.round((utilizedEquipment / totalEquipment) * 100) : 0;

    // Outstanding invoices (sent but not paid)
    const outstandingResult = await pool.query(`
      SELECT COALESCE(SUM(total), 0) AS outstanding_amount, COUNT(*) AS outstanding_count
      FROM invoices
      WHERE status IN ('sent', 'overdue')
    `);

    // Total clients
    const clientsResult = await pool.query('SELECT COUNT(*) AS total_clients FROM clients');

    res.json({
      total_bookings: parseInt(bookingsResult.rows[0].total_bookings),
      total_revenue: parseFloat(revenueResult.rows[0].total_revenue),
      active_projects: parseInt(activeResult.rows[0].active_projects),
      equipment_utilization_rate: utilizationRate,
      total_equipment: totalEquipment,
      utilized_equipment: utilizedEquipment,
      outstanding_amount: parseFloat(outstandingResult.rows[0].outstanding_amount),
      outstanding_invoices: parseInt(outstandingResult.rows[0].outstanding_count),
      total_clients: parseInt(clientsResult.rows[0].total_clients),
    });
  } catch (err) {
    next(err);
  }
};

const revenue = async (req, res, next) => {
  try {
    // Revenue by month for last 12 months
    const result = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month,
        TO_CHAR(DATE_TRUNC('month', date), 'Mon YYYY') AS month_label,
        COALESCE(SUM(total), 0) AS revenue,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) AS paid_revenue,
        COUNT(*) AS invoice_count
      FROM invoices
      WHERE date >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY DATE_TRUNC('month', date) ASC
    `);

    // Fill in missing months with zeros
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const existing = result.rows.find(r => r.month === monthKey);
      months.push({
        month: monthKey,
        month_label: existing ? existing.month_label : monthLabel,
        revenue: existing ? parseFloat(existing.revenue) : 0,
        paid_revenue: existing ? parseFloat(existing.paid_revenue) : 0,
        invoice_count: existing ? parseInt(existing.invoice_count) : 0,
      });
    }

    res.json(months);
  } catch (err) {
    next(err);
  }
};

const equipmentUtilization = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        e.id,
        e.name,
        e.total_quantity,
        c.name AS category_name,
        COALESCE(SUM(pe.quantity) FILTER (
          WHERE p.status IN ('confirmed', 'in_progress')
        ), 0) AS reserved_quantity,
        COALESCE(
          e.total_quantity - SUM(pe.quantity) FILTER (
            WHERE p.status IN ('confirmed', 'in_progress')
          ),
          e.total_quantity
        ) AS available_quantity,
        COUNT(DISTINCT pe.project_id) AS total_project_assignments,
        CASE
          WHEN e.total_quantity > 0 THEN
            ROUND(
              (COALESCE(SUM(pe.quantity) FILTER (WHERE p.status IN ('confirmed', 'in_progress')), 0)::numeric
              / e.total_quantity) * 100, 1
            )
          ELSE 0
        END AS utilization_percent
      FROM equipment e
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN project_equipment pe ON e.id = pe.equipment_id
      LEFT JOIN projects p ON pe.project_id = p.id
      GROUP BY e.id, e.name, e.total_quantity, c.name
      ORDER BY utilization_percent DESC, e.name ASC
    `);

    res.json(result.rows.map(row => ({
      ...row,
      reserved_quantity: parseInt(row.reserved_quantity),
      available_quantity: parseInt(row.available_quantity),
      utilization_percent: parseFloat(row.utilization_percent),
      total_project_assignments: parseInt(row.total_project_assignments),
    })));
  } catch (err) {
    next(err);
  }
};

const topClients = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.company,
        c.email,
        COALESCE(SUM(i.total) FILTER (WHERE i.status = 'paid'), 0) AS paid_revenue,
        COALESCE(SUM(i.total), 0) AS total_invoiced,
        COUNT(DISTINCT i.id) AS invoice_count,
        COUNT(DISTINCT p.id) AS project_count
      FROM clients c
      LEFT JOIN invoices i ON c.id = i.client_id
      LEFT JOIN projects p ON c.id = p.client_id
      GROUP BY c.id, c.name, c.company, c.email
      ORDER BY paid_revenue DESC, total_invoiced DESC
      LIMIT 5
    `);

    res.json(result.rows.map(row => ({
      ...row,
      paid_revenue: parseFloat(row.paid_revenue),
      total_invoiced: parseFloat(row.total_invoiced),
      invoice_count: parseInt(row.invoice_count),
      project_count: parseInt(row.project_count),
    })));
  } catch (err) {
    next(err);
  }
};

const crewHours = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        cm.id,
        cm.name,
        cm.role,
        cm.hourly_rate,
        COALESCE(SUM(pcm.hours), 0) AS total_hours,
        COALESCE(SUM(pcm.hours * COALESCE(pcm.rate_per_hour, cm.hourly_rate, 0)), 0) AS total_earnings,
        COUNT(DISTINCT pcm.project_id) AS project_count,
        ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) AS projects
      FROM crew_members cm
      LEFT JOIN project_crew_members pcm ON cm.id = pcm.crew_member_id
      LEFT JOIN projects p ON pcm.project_id = p.id
      GROUP BY cm.id, cm.name, cm.role, cm.hourly_rate
      ORDER BY total_hours DESC, cm.name ASC
    `);

    res.json(result.rows.map(row => ({
      ...row,
      total_hours: parseFloat(row.total_hours) || 0,
      total_earnings: parseFloat(row.total_earnings) || 0,
      project_count: parseInt(row.project_count),
      hourly_rate: row.hourly_rate ? parseFloat(row.hourly_rate) : null,
    })));
  } catch (err) {
    next(err);
  }
};

module.exports = { overview, revenue, equipmentUtilization, topClients, crewHours };
