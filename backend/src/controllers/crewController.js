const pool = require('../config/database');

const getAll = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM crew_members ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM crew_members WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Crew member not found.' });
    }

    // Also fetch projects this crew member is assigned to
    const projectsResult = await pool.query(`
      SELECT pcm.*, p.name AS project_name, p.status AS project_status, p.start_date, p.end_date
      FROM project_crew_members pcm
      JOIN projects p ON pcm.project_id = p.id
      WHERE pcm.crew_member_id = $1
      ORDER BY p.start_date DESC
    `, [id]);

    const member = result.rows[0];
    member.projects = projectsResult.rows;

    res.json(member);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, role, skills, phone, email, hourly_rate, availability_notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Crew member name is required.' });
    }

    // skills should be an array; accept both array and comma-separated string
    let skillsArray = [];
    if (Array.isArray(skills)) {
      skillsArray = skills;
    } else if (typeof skills === 'string' && skills.length > 0) {
      skillsArray = skills.split(',').map(s => s.trim());
    }

    const result = await pool.query(
      `INSERT INTO crew_members (name, role, skills, phone, email, hourly_rate, availability_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, role || null, skillsArray, phone || null, email || null, hourly_rate || null, availability_notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, skills, phone, email, hourly_rate, availability_notes } = req.body;

    const existing = await pool.query('SELECT id FROM crew_members WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Crew member not found.' });
    }

    let skillsArray = undefined;
    if (skills !== undefined) {
      if (Array.isArray(skills)) {
        skillsArray = skills;
      } else if (typeof skills === 'string') {
        skillsArray = skills.split(',').map(s => s.trim());
      }
    }

    const result = await pool.query(
      `UPDATE crew_members
       SET name = COALESCE($1, name),
           role = COALESCE($2, role),
           skills = COALESCE($3, skills),
           phone = COALESCE($4, phone),
           email = COALESCE($5, email),
           hourly_rate = COALESCE($6, hourly_rate),
           availability_notes = COALESCE($7, availability_notes)
       WHERE id = $8
       RETURNING *`,
      [name, role, skillsArray, phone, email, hourly_rate, availability_notes, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM crew_members WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Crew member not found.' });
    }

    await pool.query('DELETE FROM crew_members WHERE id = $1', [id]);
    res.json({ message: 'Crew member deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getOne, create, update, remove };
