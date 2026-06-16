/**
 * Google Calendar sync — guarded behind the GOOGLE_CALENDAR_ENABLED feature flag.
 *
 * When GOOGLE_CALENDAR_ENABLED !== 'true' (the default), every exported function
 * is a no-op and the `googleapis` package is NEVER required, so the build and
 * runtime are completely unaffected even though googleapis is not installed.
 *
 * When enabled, we lazy-require('googleapis') inside the enabled branch and use a
 * service account to (a) upsert a master event for the project on the master
 * calendar and (b) upsert a per-member event on each assigned crew member's
 * google_calendar_id, recording event ids in project_calendar_events.
 *
 * NOTE: Actual Google client creation is stubbed with a TODO below because real
 * service-account credentials are not available in this environment. See
 * docs/GOOGLE_CALENDAR.md for the required env vars and setup.
 */
const pool = require('../config/database');

function isEnabled() {
  return process.env.GOOGLE_CALENDAR_ENABLED === 'true';
}

// Lazily create an authenticated Google Calendar API client.
// Only called inside the enabled branch so googleapis is never required when disabled.
function getCalendarClient() {
  // eslint-disable-next-line global-require
  const { google } = require('googleapis');

  // TODO: provide real service-account credentials. Expected env vars:
  //   GOOGLE_SERVICE_ACCOUNT_EMAIL
  //   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  (use \n for newlines)
  // Example wiring (left here as a template — credentials unavailable in this env):
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth });
}

async function getSettings() {
  const result = await pool.query('SELECT * FROM calendar_settings WHERE id = 1');
  if (result.rows.length === 0) {
    const created = await pool.query(
      'INSERT INTO calendar_settings (id, enabled) VALUES (1, false) ON CONFLICT (id) DO NOTHING RETURNING *'
    );
    if (created.rows.length > 0) return created.rows[0];
    const reread = await pool.query('SELECT * FROM calendar_settings WHERE id = 1');
    return reread.rows[0];
  }
  return result.rows[0];
}

// Build the Google event resource body for a project.
// Google Calendar requires both start and end; end must be strictly after start.
function buildEventBody(project) {
  function toDateStr(val) {
    if (!val) return null;
    const d = val instanceof Date ? val : new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  }

  const today = new Date().toISOString().split('T')[0];
  const startDate = toDateStr(project.start_date) || today;
  let endDate = toDateStr(project.end_date) || startDate;

  // For all-day events the end date is exclusive, so it must be > start.
  if (endDate <= startDate) {
    const d = new Date(startDate + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    endDate = d.toISOString().split('T')[0];
  }

  return {
    summary: project.name,
    description: project.description || '',
    start: { date: startDate },
    end: { date: endDate },
  };
}

// Upsert (create or patch) an event on a calendar, tracked in project_calendar_events.
async function upsertEvent(calendar, calendarId, projectId, memberUserId, body) {
  const existing = await pool.query(
    `SELECT id, event_id FROM project_calendar_events
     WHERE project_id = $1 AND calendar_id = $2 AND member_user_id IS NOT DISTINCT FROM $3
     ORDER BY id DESC LIMIT 1`,
    [projectId, calendarId, memberUserId || null]
  );

  if (existing.rows.length > 0) {
    const eventId = existing.rows[0].event_id;
    await calendar.events.patch({ calendarId, eventId, requestBody: body });
    return eventId;
  }

  const res = await calendar.events.insert({ calendarId, requestBody: body });
  const eventId = res.data.id;
  await pool.query(
    `INSERT INTO project_calendar_events (project_id, calendar_id, event_id, member_user_id)
     VALUES ($1, $2, $3, $4)`,
    [projectId, calendarId, eventId, memberUserId || null]
  );
  return eventId;
}

/**
 * Sync a project: upsert master event + per-member events.
 * Safe to await; callers should still wrap in try/catch.
 */
async function syncProject(projectId) {
  if (!isEnabled()) {
    console.log('Google Calendar sync disabled');
    return;
  }

  const settings = await getSettings();
  if (!settings || !settings.enabled || !settings.master_calendar_id) {
    console.log('Google Calendar sync disabled (settings not configured)');
    return;
  }

  const projRes = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
  if (projRes.rows.length === 0) return;
  const project = projRes.rows[0];
  const body = buildEventBody(project);

  const calendar = getCalendarClient();

  // (a) master event for the project
  await upsertEvent(calendar, settings.master_calendar_id, projectId, null, body);

  // (b) per-member events for assigned crew that map to a user with a calendar id.
  // project_crew links to users; project_crew_members links to crew_members.
  const members = await pool.query(
    `SELECT DISTINCT u.id AS user_id, u.google_calendar_id
     FROM project_crew pc
     JOIN users u ON pc.crew_id = u.id
     WHERE pc.project_id = $1 AND u.google_calendar_id IS NOT NULL AND u.google_calendar_id <> ''`,
    [projectId]
  );
  for (const m of members.rows) {
    await upsertEvent(calendar, m.google_calendar_id, projectId, m.user_id, body);
  }
}

/**
 * Delete all calendar events recorded for a project.
 */
async function deleteProjectEvents(projectId) {
  if (!isEnabled()) {
    console.log('Google Calendar sync disabled');
    return;
  }
  const settings = await getSettings();
  if (!settings || !settings.enabled) return;

  const events = await pool.query(
    'SELECT calendar_id, event_id FROM project_calendar_events WHERE project_id = $1',
    [projectId]
  );
  if (events.rows.length === 0) return;

  const calendar = getCalendarClient();
  for (const e of events.rows) {
    try {
      await calendar.events.delete({ calendarId: e.calendar_id, eventId: e.event_id });
    } catch (err) {
      console.error('Google Calendar delete error:', err.message);
    }
  }
  // The project_calendar_events rows are removed by ON DELETE CASCADE when the
  // project itself is deleted; for crew-only changes they remain harmlessly.
}

module.exports = { isEnabled, getSettings, syncProject, deleteProjectEvents };
