const pool = require('../config/database');

const getAll = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        p.*,
        c.name AS client_name,
        c.company AS client_company
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;

    const projectResult = await pool.query(`
      SELECT p.*, c.name AS client_name, c.company AS client_company, c.email AS client_email
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.id = $1
    `, [id]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const project = projectResult.rows[0];

    const equipmentResult = await pool.query(`
      SELECT pe.*, e.name AS equipment_name, e.condition, e.location
      FROM project_equipment pe
      JOIN equipment e ON pe.equipment_id = e.id
      WHERE pe.project_id = $1
    `, [id]);

    const crewResult = await pool.query(`
      SELECT pcm.*, cm.name AS crew_name, cm.phone, cm.email AS crew_email, cm.role AS crew_role
      FROM project_crew_members pcm
      JOIN crew_members cm ON pcm.crew_member_id = cm.id
      WHERE pcm.project_id = $1
    `, [id]);

    const tasksResult = await pool.query(`
      SELECT t.*, u.name AS assigned_to_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.project_id = $1
      ORDER BY t.due_date ASC NULLS LAST
    `, [id]);

    project.equipment = equipmentResult.rows;
    project.crew = crewResult.rows;
    project.tasks = tasksResult.rows;

    res.json(project);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, client_id, start_date, end_date, status, budget, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required.' });
    }

    const validStatuses = ['draft', 'confirmed', 'in_progress', 'completed'];
    const projectStatus = validStatuses.includes(status) ? status : 'draft';

    const result = await pool.query(
      `INSERT INTO projects (name, client_id, start_date, end_date, status, budget, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, client_id || null, start_date || null, end_date || null, projectStatus, budget || null, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, client_id, start_date, end_date, status, budget, description } = req.body;

    const existing = await pool.query('SELECT id FROM projects WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const result = await pool.query(
      `UPDATE projects
       SET name = COALESCE($1, name),
           client_id = COALESCE($2, client_id),
           start_date = COALESCE($3, start_date),
           end_date = COALESCE($4, end_date),
           status = COALESCE($5, status),
           budget = COALESCE($6, budget),
           description = COALESCE($7, description)
       WHERE id = $8
       RETURNING *`,
      [name, client_id, start_date, end_date, status, budget, description, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM projects WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// Stage sub-resources
const getStages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM project_stages WHERE project_id = $1 ORDER BY sort_order ASC, name ASC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const addStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Stage name is required.' });
    const projectCheck = await pool.query('SELECT id FROM projects WHERE id = $1', [id]);
    if (projectCheck.rows.length === 0) return res.status(404).json({ error: 'Project not found.' });
    const result = await pool.query(
      'INSERT INTO project_stages (project_id, name) VALUES ($1, $2) RETURNING *',
      [id, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const removeStage = async (req, res, next) => {
  try {
    const { id, stageId } = req.params;
    const existing = await pool.query(
      'SELECT id FROM project_stages WHERE id = $1 AND project_id = $2',
      [stageId, id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Stage not found.' });
    await pool.query('UPDATE project_equipment SET stage_id = NULL WHERE stage_id = $1', [stageId]);
    await pool.query('DELETE FROM project_stages WHERE id = $1', [stageId]);
    res.json({ message: 'Stage removed.' });
  } catch (err) {
    next(err);
  }
};

// Equipment sub-resources
const getEquipment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT pe.*,
        e.name AS equipment_name, e.condition, e.location,
        e.daily_rate AS equipment_daily_rate,
        e.total_quantity,
        COALESCE(pe.daily_rate, e.daily_rate) AS daily_rate,
        c.name AS category_name,
        ps.name AS stage_name,
        reserved.total_reserved,
        (e.total_quantity < COALESCE(reserved.total_reserved, 0)) AS is_overbooked
      FROM project_equipment pe
      JOIN equipment e ON pe.equipment_id = e.id
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN project_stages ps ON pe.stage_id = ps.id
      LEFT JOIN (
        SELECT pe2.equipment_id, COALESCE(SUM(pe2.quantity), 0) AS total_reserved
        FROM project_equipment pe2
        JOIN projects p2 ON pe2.project_id = p2.id
        WHERE p2.status IN ('confirmed', 'in_progress')
        GROUP BY pe2.equipment_id
      ) reserved ON pe.equipment_id = reserved.equipment_id
      WHERE pe.project_id = $1
      ORDER BY ps.name NULLS LAST, c.name NULLS LAST, e.name
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const addEquipment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { equipment_id, quantity, daily_rate, stage_id } = req.body;

    if (!equipment_id || !quantity) {
      return res.status(400).json({ error: 'equipment_id and quantity are required.' });
    }

    const projectCheck = await pool.query('SELECT id FROM projects WHERE id = $1', [id]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Calculate available quantity considering ALL active projects
    const availabilityResult = await pool.query(`
      SELECT
        e.total_quantity,
        COALESCE(SUM(pe.quantity) FILTER (
          WHERE p.status IN ('confirmed', 'in_progress') AND pe.project_id IS NOT NULL
        ), 0) AS reserved_quantity
      FROM equipment e
      LEFT JOIN project_equipment pe ON e.id = pe.equipment_id
      LEFT JOIN projects p ON pe.project_id = p.id
      WHERE e.id = $1
      GROUP BY e.id
    `, [equipment_id]);

    if (availabilityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }

    const { total_quantity, reserved_quantity } = availabilityResult.rows[0];
    const available = parseInt(total_quantity) - parseInt(reserved_quantity);

    // Each (project_id, equipment_id, stage_id) combination is a unique row.
    // For the null-stage bucket, upsert to avoid duplicate unassigned rows.
    // For non-null stages, always insert a new row so the same equipment can
    // exist on multiple stages simultaneously.
    const nullStageBucket = !stage_id;
    const currentAssignment = nullStageBucket
      ? await pool.query(
          'SELECT id, quantity FROM project_equipment WHERE project_id = $1 AND equipment_id = $2 AND stage_id IS NULL',
          [id, equipment_id]
        )
      : { rows: [] };

    let adjustedAvailable = available;
    if (currentAssignment.rows.length > 0) {
      const currentQty = parseInt(currentAssignment.rows[0].quantity);
      const projectStatusResult = await pool.query('SELECT status FROM projects WHERE id = $1', [id]);
      const projectStatus = projectStatusResult.rows[0].status;
      if (['confirmed', 'in_progress'].includes(projectStatus)) {
        adjustedAvailable = available + currentQty;
      }
    }

    // Overbooking is allowed — warn but do not block
    const overbooked = parseInt(quantity) > adjustedAvailable;

    let result;
    if (currentAssignment.rows.length > 0) {
      result = await pool.query(
        `UPDATE project_equipment SET quantity = $1, daily_rate = COALESCE($2, daily_rate)
         WHERE id = $3
         RETURNING *`,
        [quantity, daily_rate || null, currentAssignment.rows[0].id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO project_equipment (project_id, equipment_id, quantity, daily_rate, stage_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, equipment_id, quantity, daily_rate || null, stage_id || null]
      );
    }

    res.status(201).json({ ...result.rows[0], overbooked });
  } catch (err) {
    next(err);
  }
};

const updateEquipment = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const { quantity, daily_rate, stage_id } = req.body;

    const existing = await pool.query(
      'SELECT * FROM project_equipment WHERE id = $1 AND project_id = $2',
      [itemId, id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Project equipment record not found.' });
    }

    if (quantity !== undefined) {
      const equipment_id = existing.rows[0].equipment_id;
      const availabilityResult = await pool.query(`
        SELECT
          e.total_quantity,
          COALESCE(SUM(pe.quantity) FILTER (
            WHERE p.status IN ('confirmed', 'in_progress') AND pe.project_id IS NOT NULL AND pe.id != $2
          ), 0) AS reserved_quantity
        FROM equipment e
        LEFT JOIN project_equipment pe ON e.id = pe.equipment_id
        LEFT JOIN projects p ON pe.project_id = p.id
        WHERE e.id = $1
        GROUP BY e.id
      `, [equipment_id, parseInt(itemId)]);

      const { total_quantity, reserved_quantity } = availabilityResult.rows[0];
      const available = parseInt(total_quantity) - parseInt(reserved_quantity);

      if (parseInt(quantity) > available) {
        return res.status(400).json({
          error: `Not enough stock. Available quantity: ${available}, requested: ${quantity}.`,
          available,
        });
      }
    }

    const result = await pool.query(
      `UPDATE project_equipment
       SET quantity = COALESCE($1, quantity),
           daily_rate = COALESCE($2, daily_rate),
           stage_id = CASE WHEN $3::int IS NOT NULL THEN $3::int ELSE stage_id END
       WHERE id = $4
       RETURNING *`,
      [quantity, daily_rate, stage_id !== undefined ? (stage_id || null) : null, itemId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const removeEquipment = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;

    const existing = await pool.query(
      'SELECT id FROM project_equipment WHERE id = $1 AND project_id = $2',
      [itemId, id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Project equipment record not found.' });
    }

    await pool.query('DELETE FROM project_equipment WHERE id = $1', [itemId]);
    res.json({ message: 'Equipment removed from project.' });
  } catch (err) {
    next(err);
  }
};

// Crew sub-resources
const getCrew = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT pcm.*, cm.name AS crew_name, cm.phone, cm.email AS crew_email, cm.skills, cm.hourly_rate AS base_rate
      FROM project_crew_members pcm
      JOIN crew_members cm ON pcm.crew_member_id = cm.id
      WHERE pcm.project_id = $1
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const addCrew = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { crew_member_id, role, hours, rate_per_hour } = req.body;

    if (!crew_member_id) {
      return res.status(400).json({ error: 'crew_member_id is required.' });
    }

    const projectCheck = await pool.query('SELECT id FROM projects WHERE id = $1', [id]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const crewCheck = await pool.query('SELECT id FROM crew_members WHERE id = $1', [crew_member_id]);
    if (crewCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Crew member not found.' });
    }

    // Check if already assigned
    const existing = await pool.query(
      'SELECT id FROM project_crew_members WHERE project_id = $1 AND crew_member_id = $2',
      [id, crew_member_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Crew member already assigned to this project.' });
    }

    const result = await pool.query(
      `INSERT INTO project_crew_members (project_id, crew_member_id, role, hours, rate_per_hour)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, crew_member_id, role || null, hours || null, rate_per_hour || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const updateCrew = async (req, res, next) => {
  try {
    const { id, memberId } = req.params;
    const { hours, rate_per_hour } = req.body;

    const existing = await pool.query(
      'SELECT id FROM project_crew_members WHERE id = $1 AND project_id = $2',
      [memberId, id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Crew assignment not found.' });
    }

    const result = await pool.query(
      `UPDATE project_crew_members
       SET hours = COALESCE($1, hours),
           rate_per_hour = COALESCE($2, rate_per_hour)
       WHERE id = $3
       RETURNING *`,
      [hours ?? null, rate_per_hour ?? null, memberId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const removeCrew = async (req, res, next) => {
  try {
    const { id, memberId } = req.params;

    const existing = await pool.query(
      'SELECT id FROM project_crew_members WHERE id = $1 AND project_id = $2',
      [memberId, id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Crew assignment not found.' });
    }

    await pool.query('DELETE FROM project_crew_members WHERE id = $1', [memberId]);
    res.json({ message: 'Crew member removed from project.' });
  } catch (err) {
    next(err);
  }
};

// Task sub-resources
const getTasks = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT t.*, u.name AS assigned_to_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.project_id = $1
      ORDER BY t.due_date ASC NULLS LAST, t.created_at ASC
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const createTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, status, assigned_to, due_date } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const projectCheck = await pool.query('SELECT id FROM projects WHERE id = $1', [id]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const validStatuses = ['todo', 'in_progress', 'done'];
    const taskStatus = validStatuses.includes(status) ? status : 'todo';

    const result = await pool.query(
      `INSERT INTO tasks (project_id, title, description, status, assigned_to, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, title, description || null, taskStatus, assigned_to || null, due_date || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const { id, taskId } = req.params;
    const { title, description, status, assigned_to, due_date } = req.body;

    const existing = await pool.query(
      'SELECT id FROM tasks WHERE id = $1 AND project_id = $2',
      [taskId, id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           assigned_to = COALESCE($4, assigned_to),
           due_date = COALESCE($5, due_date)
       WHERE id = $6
       RETURNING *`,
      [title, description, status, assigned_to, due_date, taskId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const { id, taskId } = req.params;

    const existing = await pool.query(
      'SELECT id FROM tasks WHERE id = $1 AND project_id = $2',
      [taskId, id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
  getStages,
  addStage,
  removeStage,
  getEquipment,
  addEquipment,
  updateEquipment,
  removeEquipment,
  getCrew,
  addCrew,
  updateCrew,
  removeCrew,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
};
