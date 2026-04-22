-- Migration: Add stages, category_name on quote_items
-- Run against the existing database

ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS category_name VARCHAR(255);

CREATE TABLE IF NOT EXISTS project_stages (
  id         SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_stages_project ON project_stages(project_id);

ALTER TABLE project_equipment ADD COLUMN IF NOT EXISTS stage_id INTEGER REFERENCES project_stages(id) ON DELETE SET NULL;
