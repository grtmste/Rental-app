-- Rental App Database Schema
-- Run this file to create all tables from scratch

-- Drop tables in reverse dependency order if they exist
DROP TABLE IF EXISTS equipment_logs CASCADE;
DROP TABLE IF EXISTS communication_logs CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS project_crew_members CASCADE;
DROP TABLE IF EXISTS project_crew CASCADE;
DROP TABLE IF EXISTS project_equipment CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS crew_members CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ENUM types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS equipment_condition CASCADE;
DROP TYPE IF EXISTS project_status CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS quote_status CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS equipment_log_action CASCADE;

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'crew');
CREATE TYPE equipment_condition AS ENUM ('excellent', 'good', 'fair', 'poor');
CREATE TYPE project_status AS ENUM ('draft', 'confirmed', 'in_progress', 'completed');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'declined');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue');
CREATE TYPE equipment_log_action AS ENUM ('check_in', 'check_out');

-- 1. Users
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role       user_role NOT NULL DEFAULT 'crew',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Categories
CREATE TABLE categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Equipment
CREATE TABLE equipment (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  category_id    INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  total_quantity INTEGER NOT NULL DEFAULT 1,
  condition      equipment_condition NOT NULL DEFAULT 'good',
  location       VARCHAR(255),
  description    TEXT,
  daily_rate     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  barcode        VARCHAR(255),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Clients
CREATE TABLE clients (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  company    VARCHAR(255),
  email      VARCHAR(255),
  phone      VARCHAR(50),
  address    TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Projects
CREATE TABLE projects (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  client_id   INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  start_date  DATE,
  end_date    DATE,
  status      project_status NOT NULL DEFAULT 'draft',
  budget      NUMERIC(12, 2),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Project Equipment (junction)
CREATE TABLE project_equipment (
  id           SERIAL PRIMARY KEY,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  quantity     INTEGER NOT NULL DEFAULT 1,
  daily_rate   NUMERIC(10, 2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, equipment_id)
);

-- 7. Crew Members (standalone crew profiles)
CREATE TABLE crew_members (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(255) NOT NULL,
  role                VARCHAR(100),
  skills              TEXT[] DEFAULT '{}',
  phone               VARCHAR(50),
  email               VARCHAR(255),
  hourly_rate         NUMERIC(10, 2),
  availability_notes  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Project Crew Members (junction between projects and crew_members)
CREATE TABLE project_crew_members (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  crew_member_id  INTEGER NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
  role            VARCHAR(100),
  hours           NUMERIC(8, 2),
  rate_per_hour   NUMERIC(10, 2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, crew_member_id)
);

-- 9. Project Crew (junction between projects and users — for user-based crew assignment)
CREATE TABLE project_crew (
  id           SERIAL PRIMARY KEY,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  crew_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         VARCHAR(100),
  hours        NUMERIC(8, 2),
  rate_per_hour NUMERIC(10, 2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Tasks
CREATE TABLE tasks (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  status      task_status NOT NULL DEFAULT 'todo',
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  due_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Quotes
CREATE TABLE quotes (
  id           SERIAL PRIMARY KEY,
  quote_number VARCHAR(50) NOT NULL UNIQUE,
  project_id   INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  client_id    INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status       quote_status NOT NULL DEFAULT 'draft',
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date     DATE,
  notes        TEXT,
  subtotal     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  vat_rate     NUMERIC(5, 2) NOT NULL DEFAULT 20,
  vat_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Quote Items
CREATE TABLE quote_items (
  id          SERIAL PRIMARY KEY,
  quote_id    INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  quantity    NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_total  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Invoices
CREATE TABLE invoices (
  id              SERIAL PRIMARY KEY,
  invoice_number  VARCHAR(50) NOT NULL UNIQUE,
  project_id      INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  client_id       INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  quote_id        INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
  status          invoice_status NOT NULL DEFAULT 'draft',
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  notes           TEXT,
  subtotal        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  vat_rate        NUMERIC(5, 2) NOT NULL DEFAULT 20,
  vat_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Invoice Items
CREATE TABLE invoice_items (
  id           SERIAL PRIMARY KEY,
  invoice_id   INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description  VARCHAR(500) NOT NULL,
  quantity     NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_total   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Communication Logs
CREATE TABLE communication_logs (
  id         SERIAL PRIMARY KEY,
  client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type       VARCHAR(50) NOT NULL,
  subject    VARCHAR(255),
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Equipment Logs
CREATE TABLE equipment_logs (
  id           SERIAL PRIMARY KEY,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  project_id   INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  action       equipment_log_action NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_equipment_category ON equipment(category_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_equipment_project ON project_equipment(project_id);
CREATE INDEX idx_project_equipment_equipment ON project_equipment(equipment_id);
CREATE INDEX idx_project_crew_members_project ON project_crew_members(project_id);
CREATE INDEX idx_project_crew_members_crew ON project_crew_members(crew_member_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_quotes_client ON quotes(client_id);
CREATE INDEX idx_quotes_project ON quotes(project_id);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_invoices_quote ON invoices(quote_id);
CREATE INDEX idx_communication_logs_client ON communication_logs(client_id);
CREATE INDEX idx_equipment_logs_equipment ON equipment_logs(equipment_id);
CREATE INDEX idx_equipment_logs_project ON equipment_logs(project_id);
