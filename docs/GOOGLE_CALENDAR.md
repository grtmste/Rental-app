# Google Calendar Sync

Project events can be mirrored into Google Calendar: one **master** calendar that
holds every project, plus an optional **per-member** calendar for each team member
(user) that has a Google calendar id configured.

## Disabled by default

The integration is **off** unless the `GOOGLE_CALENDAR_ENABLED` environment variable
is exactly `true`. When disabled:

- No Google API calls are made.
- The `googleapis` package is **never required** (it is lazy-required only inside the
  enabled branch), so the app builds and runs even though `googleapis` is not
  installed.
- All sync functions log `Google Calendar sync disabled` and return immediately.

## Required environment variables (when enabling)

```
GOOGLE_CALENDAR_ENABLED=true
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account>@<project>.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> The private key uses literal `\n` for newlines; they are converted at runtime.

You also need to install the client library in the backend:

```
cd backend && npm install googleapis
```

(It is intentionally **not** in `package.json` dependencies so the default,
disabled build needs nothing extra.)

## Configuring calendars (UI)

Open **Kalendri seaded** in the sidebar (`/app/calendar-settings`):

1. Set the **Master calendar ID** and toggle **enabled**. Saved via
   `PUT /api/calendar-sync/settings`.
2. For each user, enter their **Google calendar ID** (the calendar address, e.g.
   `someone@group.calendar.google.com`). Saved via
   `PUT /api/calendar-sync/members/:userId`.

The service account must be granted write access (share the calendar) to both the
master calendar and every per-member calendar.

## How sync runs

`backend/src/utils/googleCalendar.js` exposes:

- `syncProject(projectId)` — upserts the master event and a per-member event for each
  assigned crew member (`project_crew` → `users`) that has a `google_calendar_id`.
  Event ids are recorded in `project_calendar_events`.
- `deleteProjectEvents(projectId)` — deletes recorded events for a project.

These are called (wrapped in try/catch so failures never break a request) from
`projectsController.js` after a project is **created**, **updated**, **deleted**, and
after crew assignment **changes**.

## Stub note

Real service-account client creation is stubbed with a `TODO` in
`googleCalendar.js` because credentials are not available in this environment. The
JWT/`google.calendar` wiring is present as a template; supply the env vars above and
install `googleapis` to make it live.
