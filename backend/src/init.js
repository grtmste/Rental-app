const pool = require('./config/database');
const bcrypt = require('bcryptjs');

async function initSchema() {
  // Fast path: tables already exist
  try {
    await pool.query('SELECT 1 FROM users LIMIT 1');
    return;
  } catch (err) {
    if (!err.message.includes('does not exist') && !err.message.includes('relation')) throw err;
  }

  try {
    await pool.query(`DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin','manager','crew'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await pool.query(`DO $$ BEGIN CREATE TYPE equipment_condition AS ENUM ('excellent','good','fair','poor'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await pool.query(`DO $$ BEGIN CREATE TYPE project_status AS ENUM ('draft','confirmed','in_progress','completed'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await pool.query(`DO $$ BEGIN CREATE TYPE task_status AS ENUM ('todo','in_progress','done'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await pool.query(`DO $$ BEGIN CREATE TYPE quote_status AS ENUM ('draft','sent','accepted','declined'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await pool.query(`DO $$ BEGIN CREATE TYPE invoice_status AS ENUM ('draft','sent','paid','overdue'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await pool.query(`DO $$ BEGIN CREATE TYPE equipment_log_action AS ENUM ('check_in','check_out'); EXCEPTION WHEN duplicate_object THEN null; END $$`);

    await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, role user_role NOT NULL DEFAULT 'crew', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS equipment (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL, total_quantity INTEGER NOT NULL DEFAULT 1, condition equipment_condition NOT NULL DEFAULT 'good', location VARCHAR(255), description TEXT, daily_rate NUMERIC(10,2) NOT NULL DEFAULT 0, barcode VARCHAR(255), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS clients (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, company VARCHAR(255), email VARCHAR(255), phone VARCHAR(50), address TEXT, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS projects (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL, start_date DATE, end_date DATE, status project_status NOT NULL DEFAULT 'draft', budget NUMERIC(12,2), description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS project_equipment (id SERIAL PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE, quantity INTEGER NOT NULL DEFAULT 1, daily_rate NUMERIC(10,2), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS crew_members (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, role VARCHAR(100), skills TEXT[] DEFAULT '{}', phone VARCHAR(50), email VARCHAR(255), hourly_rate NUMERIC(10,2), availability_notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS project_crew_members (id SERIAL PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, crew_member_id INTEGER NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE, role VARCHAR(100), hours NUMERIC(8,2), rate_per_hour NUMERIC(10,2), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(project_id, crew_member_id))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS project_crew (id SERIAL PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, crew_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, role VARCHAR(100), hours NUMERIC(8,2), rate_per_hour NUMERIC(10,2), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS tasks (id SERIAL PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, title VARCHAR(255) NOT NULL, description TEXT, status task_status NOT NULL DEFAULT 'todo', assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL, due_date DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS quotes (id SERIAL PRIMARY KEY, quote_number VARCHAR(50) NOT NULL UNIQUE, project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE, status quote_status NOT NULL DEFAULT 'draft', date DATE NOT NULL DEFAULT CURRENT_DATE, due_date DATE, notes TEXT, subtotal NUMERIC(12,2) NOT NULL DEFAULT 0, vat_rate NUMERIC(5,2) NOT NULL DEFAULT 20, vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0, total NUMERIC(12,2) NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS quote_items (id SERIAL PRIMARY KEY, quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE, description VARCHAR(500) NOT NULL, quantity NUMERIC(10,2) NOT NULL DEFAULT 1, unit_price NUMERIC(12,2) NOT NULL DEFAULT 0, line_total NUMERIC(12,2) NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS invoices (id SERIAL PRIMARY KEY, invoice_number VARCHAR(50) NOT NULL UNIQUE, project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE, quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL, status invoice_status NOT NULL DEFAULT 'draft', date DATE NOT NULL DEFAULT CURRENT_DATE, due_date DATE, notes TEXT, subtotal NUMERIC(12,2) NOT NULL DEFAULT 0, vat_rate NUMERIC(5,2) NOT NULL DEFAULT 20, vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0, total NUMERIC(12,2) NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS invoice_items (id SERIAL PRIMARY KEY, invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, description VARCHAR(500) NOT NULL, quantity NUMERIC(10,2) NOT NULL DEFAULT 1, unit_price NUMERIC(12,2) NOT NULL DEFAULT 0, line_total NUMERIC(12,2) NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS communication_logs (id SERIAL PRIMARY KEY, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, type VARCHAR(50) NOT NULL, subject VARCHAR(255), message TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS equipment_logs (id SERIAL PRIMARY KEY, equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE, project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, action equipment_log_action NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    console.log('✅ Schema initialised');
  } catch (err) {
    console.error('⚠️  Schema init error:', err.message);
    throw err;
  }
}

async function runMigrations() {
  try {
    await pool.query(`ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS category_name VARCHAR(255)`);
    await pool.query(`ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS stage_name VARCHAR(255)`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_stages (
        id         SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name       VARCHAR(255) NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_project_stages_project ON project_stages(project_id)`);
    await pool.query(`ALTER TABLE project_equipment ADD COLUMN IF NOT EXISTS stage_id INTEGER REFERENCES project_stages(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE project_equipment DROP CONSTRAINT IF EXISTS project_equipment_project_id_equipment_id_key`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pe_unique_staged ON project_equipment (project_id, equipment_id, stage_id) WHERE stage_id IS NOT NULL`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pe_unique_unstaged ON project_equipment (project_id, equipment_id) WHERE stage_id IS NULL`);
    await pool.query(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS category_name VARCHAR(255)`);
    await pool.query(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS stage_name VARCHAR(255)`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_statuses (
        id SERIAL PRIMARY KEY,
        key VARCHAR(50) NOT NULL UNIQUE,
        label VARCHAR(255) NOT NULL,
        color VARCHAR(50) NOT NULL DEFAULT 'gray',
        sort_order INTEGER DEFAULT 0,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      INSERT INTO project_statuses (key, label, color, sort_order, is_default)
      VALUES
        ('draft', 'Mustand', 'gray', 0, true),
        ('confirmed', 'Kinnitatud', 'blue', 1, true),
        ('in_progress', 'Töös', 'orange', 2, true),
        ('completed', 'Lõpetatud', 'green', 3, true)
      ON CONFLICT (key) DO NOTHING
    `);

    // ── Feature 2: event_name on quotes & invoices ──
    await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS event_name VARCHAR(255)`);
    await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS event_name VARCHAR(255)`);

    // ── Feature 5: item_type on items, discount_pct on quotes & invoices ──
    await pool.query(`ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) NOT NULL DEFAULT 'equipment'`);
    await pool.query(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) NOT NULL DEFAULT 'equipment'`);
    await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0`);

    // ── Feature 6: project templates ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_template_stages (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        sort_order INTEGER DEFAULT 0
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_template_items (
        id SERIAL PRIMARY KEY,
        template_stage_id INTEGER NOT NULL REFERENCES project_template_stages(id) ON DELETE CASCADE,
        equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1
      )
    `);

    // ── Feature 7: Google Calendar sync scaffolding ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        master_calendar_id VARCHAR(255),
        enabled BOOLEAN DEFAULT false,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (id = 1)
      )
    `);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(255)`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_calendar_events (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        calendar_id VARCHAR(255) NOT NULL,
        event_id VARCHAR(255) NOT NULL,
        member_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    console.log('✅ Migrations applied');
  } catch (err) {
    console.error('⚠️  Migration error:', err.message);
  }
}

async function ensureAdminExists() {
  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = 'admin@stereosound.ee'");
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await pool.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('Admin User', 'admin@stereosound.ee', $1, 'admin')",
        [hash]
      );
      console.log('✅ Admin user created: admin@stereosound.ee / admin123');
    }
  } catch (err) {
    console.error('⚠️  Could not auto-seed admin:', err.message);
  }
}

module.exports = async function init() {
  await initSchema();
  await runMigrations();
  await ensureAdminExists();
};
