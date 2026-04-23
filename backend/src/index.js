require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const pool = require('./config/database');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/crew', require('./routes/crew'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/analytics', require('./routes/analytics'));

app.use(require('./middleware/errorHandler'));

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
    // Replace (project_id, equipment_id) unique constraint with per-stage uniqueness
    await pool.query(`ALTER TABLE project_equipment DROP CONSTRAINT IF EXISTS project_equipment_project_id_equipment_id_key`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pe_unique_staged ON project_equipment (project_id, equipment_id, stage_id) WHERE stage_id IS NOT NULL`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pe_unique_unstaged ON project_equipment (project_id, equipment_id) WHERE stage_id IS NULL`);
    await pool.query(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS category_name VARCHAR(255)`);
    await pool.query(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS stage_name VARCHAR(255)`);
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
    console.error('⚠️  Could not auto-seed admin (DB may not be ready):', err.message);
  }
}

const PORT = process.env.PORT || 3001;

function checkSmtpConfig() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  HOIATUS: SMTP seadistus puudub. E-kirjade saatmine ei tööta.');
    console.warn('   Täitke SMTP_USER ja SMTP_PASS väljad failis .env');
  } else {
    console.log(`✅ SMTP seadistatud: ${process.env.SMTP_USER}`);
  }
}

async function start() {
  await runMigrations();
  await ensureAdminExists();
  checkSmtpConfig();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
