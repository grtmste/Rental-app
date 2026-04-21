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
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await ensureAdminExists();
});
