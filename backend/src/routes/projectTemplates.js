const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

// GET /api/project-templates - list templates with stage + item counts
router.get('/', auth, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT t.*,
        (SELECT COUNT(*) FROM project_template_stages s WHERE s.template_id = t.id) AS stage_count,
        (SELECT COUNT(*) FROM project_template_items i
           JOIN project_template_stages s ON i.template_stage_id = s.id
           WHERE s.template_id = t.id) AS item_count
      FROM project_templates t
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/project-templates/:id - template with nested stages and items
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const tRes = await pool.query('SELECT * FROM project_templates WHERE id = $1', [id]);
    if (tRes.rows.length === 0) return res.status(404).json({ error: 'Template not found.' });
    const template = tRes.rows[0];

    const stages = await pool.query(
      'SELECT * FROM project_template_stages WHERE template_id = $1 ORDER BY sort_order ASC, id ASC',
      [id]
    );
    const items = await pool.query(`
      SELECT i.*, e.name AS equipment_name, c.name AS category_name
      FROM project_template_items i
      JOIN project_template_stages s ON i.template_stage_id = s.id
      JOIN equipment e ON i.equipment_id = e.id
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE s.template_id = $1
      ORDER BY i.id ASC
    `, [id]);

    template.stages = stages.rows.map(st => ({
      ...st,
      items: items.rows.filter(it => it.template_stage_id === st.id),
    }));
    res.json(template);
  } catch (err) {
    next(err);
  }
});

// Helper: replace stages+items for a template id
async function writeStages(dbClient, templateId, stages) {
  for (const stage of (stages || [])) {
    const sRes = await dbClient.query(
      'INSERT INTO project_template_stages (template_id, name, sort_order) VALUES ($1, $2, $3) RETURNING id',
      [templateId, stage.name, stage.sort_order || 0]
    );
    const stageId = sRes.rows[0].id;
    for (const item of (stage.items || [])) {
      if (!item.equipment_id) continue;
      await dbClient.query(
        'INSERT INTO project_template_items (template_stage_id, equipment_id, quantity) VALUES ($1, $2, $3)',
        [stageId, item.equipment_id, item.quantity || 1]
      );
    }
  }
}

// POST /api/project-templates - create template
router.post('/', auth, async (req, res, next) => {
  const dbClient = await pool.connect();
  try {
    const { name, description, stages } = req.body;
    if (!name) return res.status(400).json({ error: 'Template name is required.' });

    await dbClient.query('BEGIN');
    const tRes = await dbClient.query(
      'INSERT INTO project_templates (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );
    const template = tRes.rows[0];
    await writeStages(dbClient, template.id, stages);
    await dbClient.query('COMMIT');
    res.status(201).json(template);
  } catch (err) {
    await dbClient.query('ROLLBACK');
    next(err);
  } finally {
    dbClient.release();
  }
});

// PUT /api/project-templates/:id - update template (replace stages/items)
router.put('/:id', auth, async (req, res, next) => {
  const dbClient = await pool.connect();
  try {
    const { id } = req.params;
    const { name, description, stages } = req.body;

    const existing = await dbClient.query('SELECT id FROM project_templates WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Template not found.' });

    await dbClient.query('BEGIN');
    await dbClient.query(
      `UPDATE project_templates SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3`,
      [name || null, description !== undefined ? description : null, id]
    );
    if (stages !== undefined) {
      // Cascades to project_template_items
      await dbClient.query('DELETE FROM project_template_stages WHERE template_id = $1', [id]);
      await writeStages(dbClient, id, stages);
    }
    await dbClient.query('COMMIT');

    const tRes = await pool.query('SELECT * FROM project_templates WHERE id = $1', [id]);
    res.json(tRes.rows[0]);
  } catch (err) {
    await dbClient.query('ROLLBACK');
    next(err);
  } finally {
    dbClient.release();
  }
});

// DELETE /api/project-templates/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT id FROM project_templates WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Template not found.' });
    await pool.query('DELETE FROM project_templates WHERE id = $1', [id]);
    res.json({ message: 'Template deleted.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/project-templates/:id/create-project  { name, client_id, start_date, end_date }
router.post('/:id/create-project', auth, async (req, res, next) => {
  const dbClient = await pool.connect();
  try {
    const { id } = req.params;
    const { name, client_id, start_date, end_date } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required.' });

    const tRes = await dbClient.query('SELECT id FROM project_templates WHERE id = $1', [id]);
    if (tRes.rows.length === 0) return res.status(404).json({ error: 'Template not found.' });

    await dbClient.query('BEGIN');

    const projRes = await dbClient.query(
      `INSERT INTO projects (name, client_id, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, 'draft') RETURNING id`,
      [name, client_id || null, start_date || null, end_date || null]
    );
    const projectId = projRes.rows[0].id;

    const stages = await dbClient.query(
      'SELECT * FROM project_template_stages WHERE template_id = $1 ORDER BY sort_order ASC, id ASC',
      [id]
    );
    for (const stage of stages.rows) {
      const newStage = await dbClient.query(
        'INSERT INTO project_stages (project_id, name, sort_order) VALUES ($1, $2, $3) RETURNING id',
        [projectId, stage.name, stage.sort_order || 0]
      );
      const newStageId = newStage.rows[0].id;
      const items = await dbClient.query(
        'SELECT * FROM project_template_items WHERE template_stage_id = $1',
        [stage.id]
      );
      for (const item of items.rows) {
        await dbClient.query(
          'INSERT INTO project_equipment (project_id, equipment_id, quantity, stage_id) VALUES ($1, $2, $3, $4)',
          [projectId, item.equipment_id, item.quantity || 1, newStageId]
        );
      }
    }

    await dbClient.query('COMMIT');
    res.status(201).json({ id: projectId });
  } catch (err) {
    await dbClient.query('ROLLBACK');
    next(err);
  } finally {
    dbClient.release();
  }
});

// POST /api/project-templates/from-project/:projectId  { name }
// Snapshot a project's stages + equipment into a new template.
router.post('/from-project/:projectId', auth, async (req, res, next) => {
  const dbClient = await pool.connect();
  try {
    const { projectId } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Template name is required.' });

    const projRes = await dbClient.query('SELECT id, description FROM projects WHERE id = $1', [projectId]);
    if (projRes.rows.length === 0) return res.status(404).json({ error: 'Project not found.' });

    await dbClient.query('BEGIN');
    const tRes = await dbClient.query(
      'INSERT INTO project_templates (name, description) VALUES ($1, $2) RETURNING *',
      [name, projRes.rows[0].description || null]
    );
    const template = tRes.rows[0];

    const stages = await dbClient.query(
      'SELECT * FROM project_stages WHERE project_id = $1 ORDER BY sort_order ASC, id ASC',
      [projectId]
    );
    for (const stage of stages.rows) {
      const newStage = await dbClient.query(
        'INSERT INTO project_template_stages (template_id, name, sort_order) VALUES ($1, $2, $3) RETURNING id',
        [template.id, stage.name, stage.sort_order || 0]
      );
      const newStageId = newStage.rows[0].id;
      const items = await dbClient.query(
        'SELECT equipment_id, quantity FROM project_equipment WHERE project_id = $1 AND stage_id = $2',
        [projectId, stage.id]
      );
      for (const item of items.rows) {
        await dbClient.query(
          'INSERT INTO project_template_items (template_stage_id, equipment_id, quantity) VALUES ($1, $2, $3)',
          [newStageId, item.equipment_id, item.quantity || 1]
        );
      }
    }

    await dbClient.query('COMMIT');
    res.status(201).json(template);
  } catch (err) {
    await dbClient.query('ROLLBACK');
    next(err);
  } finally {
    dbClient.release();
  }
});

module.exports = router;
