#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CURRENT_USER=$(whoami)
PG_VERSION=$(ls /usr/lib/postgresql/ 2>/dev/null | sort -V | tail -1)
PG_BIN="/usr/lib/postgresql/${PG_VERSION}/bin"
PG_DATA="$HOME/.rental_pgdata"
PG_PORT=5432
PG_LOG="$HOME/.rental_pg.log"

echo "=== Rental App Setup ==="
echo "User: $CURRENT_USER | PostgreSQL: $PG_VERSION"

# ── 1. Start or initialize PostgreSQL ──────────────────────────────────────────
if pg_isready -p $PG_PORT -q 2>/dev/null; then
  echo "✅ PostgreSQL already running on port $PG_PORT"
else
  if [ ! -d "$PG_DATA" ]; then
    echo "▶ Initializing PostgreSQL cluster..."
    "$PG_BIN/initdb" -D "$PG_DATA" \
      --auth=trust \
      --username="$CURRENT_USER" \
      -E UTF8 \
      --locale=C.UTF-8 \
      -q
  fi

  echo "▶ Starting PostgreSQL..."
  "$PG_BIN/pg_ctl" -D "$PG_DATA" -l "$PG_LOG" -o "-p $PG_PORT" start -w
  sleep 1
fi

# ── 2. Create database ──────────────────────────────────────────────────────────
echo "▶ Creating database..."
"$PG_BIN/createdb" -U "$CURRENT_USER" -p $PG_PORT rental_app 2>/dev/null \
  && echo "  Created rental_app" \
  || echo "  (already exists)"

# ── 3. Write .env ───────────────────────────────────────────────────────────────
echo "▶ Writing backend/.env..."
cat > "$SCRIPT_DIR/backend/.env" <<EOF
DATABASE_URL=postgresql://${CURRENT_USER}@localhost:${PG_PORT}/rental_app
JWT_SECRET=rentpro-super-secret-jwt-key-2025
PORT=3001
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=karmogudinas@gmail.com
EOF

# ── 4. Run schema ───────────────────────────────────────────────────────────────
echo "▶ Running schema..."
psql -U "$CURRENT_USER" -p $PG_PORT -d rental_app \
  -f "$SCRIPT_DIR/backend/src/db/schema.sql" -q

# ── 5. Run seed ─────────────────────────────────────────────────────────────────
echo "▶ Seeding data..."
psql -U "$CURRENT_USER" -p $PG_PORT -d rental_app \
  -f "$SCRIPT_DIR/backend/src/db/seed.sql" -q

echo ""
echo "✅ Setup complete!"
echo ""
echo "   Admin login:"
echo "   Email:    admin@stereosound.ee"
echo "   Password: admin123"
echo ""
echo "   Terminal 1:  cd /workspaces/Rental-app/backend && npm run dev"
echo "   Terminal 2:  cd /workspaces/Rental-app/frontend && npm run dev"
