#!/bin/bash
set -e

echo "=== Rental App Setup ==="

# 1. Start PostgreSQL
echo ""
echo "▶ Starting PostgreSQL..."
if command -v pg_ctlcluster &> /dev/null; then
  sudo pg_ctlcluster 16 main start 2>/dev/null || echo "  (already running)"
elif command -v /usr/bin/pg_ctlcluster &> /dev/null; then
  sudo /usr/bin/pg_ctlcluster 16 main start 2>/dev/null || echo "  (already running)"
else
  sudo service postgresql start 2>/dev/null || pg_ctl start 2>/dev/null || echo "  Could not start PostgreSQL automatically"
fi

sleep 2

# 2. Set postgres password
echo ""
echo "▶ Configuring PostgreSQL user..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || true

# 3. Create database
echo ""
echo "▶ Creating database..."
sudo -u postgres psql -c "CREATE DATABASE rental_app;" 2>/dev/null || echo "  (already exists)"

# 4. Run schema
echo ""
echo "▶ Running schema..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
sudo -u postgres psql -d rental_app -f "$SCRIPT_DIR/backend/src/db/schema.sql"

# 5. Run seed
echo ""
echo "▶ Seeding data..."
sudo -u postgres psql -d rental_app -f "$SCRIPT_DIR/backend/src/db/seed.sql"

# 6. Ensure .env exists
echo ""
echo "▶ Setting up .env..."
if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
  cp "$SCRIPT_DIR/backend/.env.example" "$SCRIPT_DIR/backend/.env"
fi
# Set working DATABASE_URL
sed -i 's|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rental_app|' "$SCRIPT_DIR/backend/.env"
sed -i 's|^JWT_SECRET=.*|JWT_SECRET=rentpro-super-secret-jwt-key-2025|' "$SCRIPT_DIR/backend/.env"

echo ""
echo "✅ Setup complete!"
echo ""
echo "   Admin login:"
echo "   Email:    admin@stereosound.ee"
echo "   Password: admin123"
echo ""
echo "   Now run:"
echo "   Terminal 1: cd backend && npm run dev"
echo "   Terminal 2: cd frontend && npm run dev"
