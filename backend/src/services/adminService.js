const pool = require('../config/db');
const AppError = require('../utils/AppError');
const argon2 = require('argon2');
const deviceService = require('./deviceService');
const storage = require('./storageService');
const { decrypt } = require('./encryption');

// Everything the administrator can look at is METADATA about accounts and activity: who did what, to which
// type of record, when, and from where. Nothing here reads a record's contents, a note, a lab value or a
// document, and no query below touches those tables. The only patient details shown are the name and the
// patient code, so the administrator can tell which account an event belongs to.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// What counts as worth a flag on the security screen. Shown to the administrator next to the flags.
const THRESHOLDS = { failedLogins: 5, failedPins: 5, patientsPerDoctorPerDay: 10, windowHours: 24, resetDays: 7 };

const likeOf = (q) => `%${String(q).trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
const clampInt = (v, def, max) => Math.min(Math.max(parseInt(v, 10) || def, 1), max);

// ---- Overview -----------------------------------------------------------------------------------

async function overview() {
  const one = async (sql) => (await pool.query(sql)).rows[0];
  const users = await one(`SELECT
      count(*) FILTER (WHERE role = 'patient')::int AS patients,
      count(*) FILTER (WHERE role = 'provider')::int AS doctors,
      count(*) FILTER (WHERE status = 'suspended')::int AS suspended
    FROM users`);
  const doctors = await one(`SELECT
      count(*) FILTER (WHERE verification_status = 'pending')::int AS pending,
      count(*) FILTER (WHERE verification_status = 'verified')::int AS verified,
      count(*) FILTER (WHERE verification_status = 'rejected')::int AS rejected
    FROM provider_profile`);
  const live = await one(`SELECT
      (SELECT count(*)::int FROM provider_sessions WHERE ended_at IS NULL AND expires_at > now()) AS open_sessions,
      (SELECT count(*)::int FROM record_shares WHERE standing AND revoked_at IS NULL) AS active_qr,
      (SELECT count(*)::int FROM record_shares WHERE NOT standing AND revoked_at IS NULL AND expires_at > now()) AS active_links,
      (SELECT count(*)::int FROM devices WHERE revoked_at IS NULL) AS phones,
      (SELECT count(*)::int FROM login_events WHERE success AND occurred_at > now() - interval '24 hours') AS logins_24h,
      (SELECT count(*)::int FROM login_events WHERE NOT success AND occurred_at > now() - interval '24 hours') AS failed_logins_24h`);
  const { rows: series } = await pool.query(`
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
      (SELECT count(*)::int FROM users u WHERE u.created_at::date = d.day AND u.role = 'patient') AS patients,
      (SELECT count(*)::int FROM users u WHERE u.created_at::date = d.day AND u.role = 'provider') AS doctors,
      (SELECT count(*)::int FROM login_events l WHERE l.occurred_at::date = d.day AND l.success) AS logins,
      (SELECT count(*)::int FROM provider_sessions s WHERE s.started_at::date = d.day) AS sessions
    FROM generate_series(current_date - 29, current_date, interval '1 day') AS d(day)
    ORDER BY d.day`);
  return { users, doctors, live, series };
}

// ---- Users --------------------------------------------------------------------------------------

const USER_SELECT = `
  SELECT u.user_id, u.email, u.role, u.status, u.created_at,
         COALESCE(pp.first_name, pr.first_name) AS first_name,
         COALESCE(pp.last_name, pr.last_name) AS last_name,
         pp.patient_code, pr.provider_id, pr.licence_number, pr.verification_status,
         (SELECT max(occurred_at) FROM login_events l WHERE l.user_id = u.user_id AND l.success) AS last_login
    FROM users u
    LEFT JOIN patient_profile pp ON pp.user_id = u.user_id
    LEFT JOIN provider_profile pr ON pr.user_id = u.user_id`;

async function users({ q, role, status, limit, offset }) {
  const lim = clampInt(limit, 25, 100);
  const off = Math.max(parseInt(offset, 10) || 0, 0);
  const where = ["u.role IN ('patient', 'provider')"];
  const args = [];
  if (role === 'patient' || role === 'provider') where.push(`u.role = $${args.push(role)}`);
  if (status === 'active' || status === 'suspended') where.push(`u.status = $${args.push(status)}`);
  if (q && String(q).trim()) {
    const p = `$${args.push(likeOf(q))}`;
    where.push(`(u.email ILIKE ${p} ESCAPE '\\' OR COALESCE(pp.first_name, pr.first_name) || ' ' || COALESCE(pp.last_name, pr.last_name) ILIKE ${p} ESCAPE '\\' OR pp.patient_code ILIKE ${p} ESCAPE '\\')`);
  }
  const { rows } = await pool.query(
    `${USER_SELECT} WHERE ${where.join(' AND ')} ORDER BY u.created_at DESC LIMIT ${lim + 1} OFFSET ${off}`,
    args,
  );
  return { users: rows.slice(0, lim), has_more: rows.length > lim };
}

async function userDetail(userId) {
  if (!UUID.test(userId)) throw new AppError(404, 'User not found.');
  const { rows } = await pool.query(`${USER_SELECT} WHERE u.user_id = $1 AND u.role IN ('patient', 'provider')`, [userId]);
  const user = rows[0];
  if (!user) throw new AppError(404, 'User not found.');

  const logins = (
    await pool.query(
      `SELECT success, reason, source, host(ip_address) AS ip, occurred_at FROM login_events
        WHERE user_id = $1 ORDER BY occurred_at DESC LIMIT 15`,
      [userId],
    )
  ).rows;
  const detail = { user, logins };

  if (user.role === 'patient') {
    detail.devices = (
      await pool.query(
        `SELECT d.platform, d.device_name, d.last_seen_at, d.created_at, d.revoked_at
           FROM devices d JOIN patient_profile p ON p.patient_id = d.patient_id
          WHERE p.user_id = $1 ORDER BY d.created_at DESC LIMIT 10`,
        [userId],
      )
    ).rows;
    detail.last_sync = (
      await pool.query(
        `SELECT max(s.synced_at) AS at FROM sync_log s JOIN patient_profile p ON p.patient_id = s.patient_id WHERE p.user_id = $1`,
        [userId],
      )
    ).rows[0].at;
    detail.shares = (
      await pool.query(
        `SELECT count(*)::int AS n FROM record_shares r JOIN patient_profile p ON p.patient_id = r.patient_id
          WHERE p.user_id = $1 AND r.revoked_at IS NULL AND r.expires_at > now()`,
        [userId],
      )
    ).rows[0].n;
  } else {
    detail.activity = (await doctorActivity()).find((a) => a.provider_id === user.provider_id) ?? null;
  }
  detail.admin_actions = (
    await pool.query(
      `SELECT a.action, a.note, a.occurred_at, u.email AS admin_email FROM admin_user_actions a
         LEFT JOIN users u ON u.user_id = a.admin_user_id WHERE a.target_user_id = $1 ORDER BY a.occurred_at DESC LIMIT 10`,
      [userId],
    )
  ).rows;
  return detail;
}

async function targetOf(userId) {
  if (!UUID.test(userId)) throw new AppError(404, 'User not found.');
  const { rows } = await pool.query('SELECT user_id, email, role, status FROM users WHERE user_id = $1', [userId]);
  const target = rows[0];
  if (!target) throw new AppError(404, 'User not found.');
  if (target.role === 'admin') throw new AppError(400, 'Administrator accounts cannot be changed here.');
  return target;
}

const logAction = (adminUserId, target, action, note) =>
  pool.query('INSERT INTO admin_user_actions (admin_user_id, target_user_id, target_email, action, note) VALUES ($1, $2, $3, $4, $5)', [
    adminUserId,
    target.user_id,
    target.email,
    action,
    note,
  ]);

// Suspending stops the account at once: its login token no longer works, a patient's phones lose their offline
// keys, and a doctor's open sessions are ended. Reactivating lets the person log in again (phones sign in again).
async function setStatus(adminUserId, userId, status, note) {
  const target = await targetOf(userId);
  if (target.user_id === adminUserId) throw new AppError(400, 'You cannot change your own account.');
  if (target.status === status) throw new AppError(409, status === 'suspended' ? 'This account is already suspended.' : 'This account is already active.');
  await pool.query('UPDATE users SET status = $2 WHERE user_id = $1', [userId, status]);
  let phones = 0;
  let ended = 0;
  if (status === 'suspended') {
    phones = await deviceService.revokeAllForUser(userId);
    const r = await pool.query(
      `UPDATE provider_sessions SET ended_at = now(), ended_by = 'admin'
        WHERE ended_at IS NULL AND expires_at > now() AND provider_id IN (SELECT provider_id FROM provider_profile WHERE user_id = $1)`,
      [userId],
    );
    ended = r.rowCount;
  }
  await logAction(adminUserId, target, status === 'suspended' ? 'suspend' : 'reactivate', note);
  return { status, phones_signed_out: phones, sessions_ended: ended };
}

async function revokeDevices(adminUserId, userId, note) {
  const target = await targetOf(userId);
  const phones = await deviceService.revokeAllForUser(userId);
  await logAction(adminUserId, target, 'revoke_devices', note);
  return { phones_signed_out: phones };
}

// ---- Administrators: list, create, delete accounts -----------------------------------------------

async function admins() {
  const { rows } = await pool.query(
    `SELECT u.user_id, u.email, u.status, u.created_at, u.must_change_password,
            (SELECT max(occurred_at) FROM login_events l WHERE l.user_id = u.user_id AND l.success) AS last_login
       FROM users u WHERE u.role = 'admin' ORDER BY u.created_at`,
  );
  return rows;
}

// The creating admin proves who they are by typing their own password again.
async function createAdmin(adminUserId, { email, password, adminPassword }) {
  const me = (await pool.query('SELECT password_hash FROM users WHERE user_id = $1', [adminUserId])).rows[0];
  if (!me || !(await argon2.verify(me.password_hash, adminPassword))) throw new AppError(400, 'Your own password is not right.');
  let created;
  try {
    created = (
      await pool.query(
        "INSERT INTO users (email, password_hash, role, must_change_password) VALUES ($1, $2, 'admin', true) RETURNING user_id, email, created_at",
        [email, await argon2.hash(password)],
      )
    ).rows[0];
  } catch (err) {
    if (err.code === '23505') throw new AppError(409, 'An account with this email already exists.');
    throw err;
  }
  await logAction(adminUserId, created, 'create_admin', null);
  return created;
}

// Erases an account for good. A patient's records, documents, phones and links go with it. A doctor's login and
// profile details go, but what they entered stays in the patients' records, labelled as a removed doctor.
// Everything happens in one transaction, so a failure leaves the account exactly as it was.
async function deleteUser(adminUserId, userId, { email, note }) {
  if (!UUID.test(userId)) throw new AppError(404, 'User not found.');
  if (userId === adminUserId) throw new AppError(400, 'You cannot delete your own account.');
  const target = (await pool.query('SELECT user_id, email, role FROM users WHERE user_id = $1', [userId])).rows[0];
  if (!target) throw new AppError(404, 'User not found.');
  if (target.email.toLowerCase() !== email.toLowerCase()) throw new AppError(400, 'The email you typed does not match this account.');
  if (target.role === 'admin') {
    const left = (await pool.query("SELECT count(*)::int AS n FROM users WHERE role = 'admin' AND user_id <> $1 AND status = 'active'", [userId])).rows[0].n;
    if (left < 1) throw new AppError(409, 'This is the last administrator and cannot be deleted.');
  }

  const client = await pool.connect();
  let fileKeys = [];
  try {
    await client.query('BEGIN');
    if (target.role === 'patient') {
      const docs = await client.query(
        `SELECT d.file_path_enc FROM medical_documents d JOIN patient_profile p ON p.patient_id = d.patient_id WHERE p.user_id = $1`,
        [userId],
      );
      fileKeys = docs.rows.map((r) => decrypt(r.file_path_enc));
    }
    if (target.role === 'provider') {
      await client.query(
        `UPDATE provider_sessions SET ended_at = now(), ended_by = 'admin'
          WHERE ended_at IS NULL AND provider_id IN (SELECT provider_id FROM provider_profile WHERE user_id = $1)`,
        [userId],
      );
      await client.query(
        `UPDATE provider_profile SET first_name = 'Removed', last_name = 'doctor', licence_number = 'REMOVED-' || left(provider_id::text, 8),
                facility_name = '-', specialty = NULL, verification_status = 'rejected', verification_note = NULL, verified_by = NULL
          WHERE user_id = $1`,
        [userId],
      );
    }
    // The person's email leaves the older log lines. Only the deletion line below keeps it.
    await client.query("UPDATE login_events SET email = '(deleted account)' WHERE user_id = $1", [userId]);
    await client.query("UPDATE admin_user_actions SET target_email = '(deleted account)' WHERE target_user_id = $1", [userId]);
    await client.query('DELETE FROM users WHERE user_id = $1', [userId]);
    await client.query(
      'INSERT INTO admin_user_actions (admin_user_id, target_user_id, target_email, action, note) VALUES ($1, NULL, $2, $3, $4)',
      [adminUserId, `${target.email} (${target.role === 'provider' ? 'doctor' : target.role})`, 'delete', note],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  // The database is final; leftover files that cannot be removed are logged, not shown.
  for (const key of fileKeys) await storage.remove(key).catch((e) => console.error('Could not remove stored file:', e.message));
  return { deleted: true, documents_removed: fileKeys.length };
}

// ---- Doctor activity (counts only) ----------------------------------------------------------------

async function doctorActivity() {
  const { rows } = await pool.query(
    `SELECT pr.provider_id,
            (SELECT count(*)::int FROM provider_sessions s WHERE s.provider_id = pr.provider_id) AS sessions,
            (SELECT count(DISTINCT s.patient_id)::int FROM provider_sessions s WHERE s.provider_id = pr.provider_id) AS patients,
            (SELECT count(*)::int FROM audit_logs a WHERE a.actor_type = 'provider' AND a.actor_id = pr.user_id AND a.action = 'create') AS records_added,
            (SELECT count(*)::int FROM audit_logs a WHERE a.actor_type = 'provider' AND a.actor_id = pr.user_id AND a.action = 'print') AS prints,
            (SELECT max(s.started_at) FROM provider_sessions s WHERE s.provider_id = pr.provider_id) AS last_session
       FROM provider_profile pr`,
  );
  return rows;
}

// ---- Activity timeline ----------------------------------------------------------------------------
// One list built from every place the system keeps a trail. Each row has the same shape:
//   at, category, action, result, actor (email, name, role), patient (name, code), record_type, ip, detail

const FEED = `
  SELECT l.occurred_at AS at, 'login' AS category,
         CASE WHEN l.success THEN 'Logged in' ELSE 'Failed login' END AS action,
         CASE WHEN l.success THEN 'ok' ELSE 'failed' END AS result,
         l.email AS actor_email, COALESCE(pp.first_name || ' ' || pp.last_name, pr.first_name || ' ' || pr.last_name) AS actor_name,
         u.role AS actor_role, NULL::text AS patient_name, NULL::text AS patient_code, NULL::text AS record_type,
         host(l.ip_address) AS ip,
         CASE l.reason WHEN 'ok' THEN NULL WHEN 'bad_password' THEN 'Wrong password' WHEN 'unknown_email' THEN 'No account with this email' ELSE 'Account is suspended' END
           || CASE WHEN l.source = 'app' THEN '' ELSE '' END AS detail,
         l.source AS source, l.user_id AS actor_id, NULL::uuid AS patient_user_id
    FROM login_events l
    LEFT JOIN users u ON u.user_id = l.user_id
    LEFT JOIN patient_profile pp ON pp.user_id = l.user_id
    LEFT JOIN provider_profile pr ON pr.user_id = l.user_id
  UNION ALL
  SELECT a.occurred_at, 'record',
         CASE a.action WHEN 'view' THEN 'Viewed' WHEN 'create' THEN 'Added' WHEN 'update' THEN 'Changed' WHEN 'delete' THEN 'Deleted' ELSE 'Printed' END,
         'ok', u.email, COALESCE(ap.first_name || ' ' || ap.last_name, apr.first_name || ' ' || apr.last_name),
         CASE a.actor_type WHEN 'share_token' THEN 'link' ELSE a.actor_type END,
         pp.first_name || ' ' || pp.last_name, pp.patient_code, a.record_type, host(a.ip_address),
         CASE WHEN a.actor_type = 'share_token' THEN 'Opened with a share link or permanent QR' END, NULL, a.actor_id, pp.user_id
    FROM audit_logs a
    JOIN patient_profile pp ON pp.patient_id = a.patient_id
    LEFT JOIN users u ON u.user_id = a.actor_id
    LEFT JOIN patient_profile ap ON ap.user_id = a.actor_id
    LEFT JOIN provider_profile apr ON apr.user_id = a.actor_id
  UNION ALL
  SELECT s.started_at, 'session',
         CASE s.opened_via WHEN 'qr' THEN 'Opened a record by QR scan' ELSE 'Opened a record with code and PIN' END,
         'ok', u.email, pr.first_name || ' ' || pr.last_name, 'provider',
         pp.first_name || ' ' || pp.last_name, pp.patient_code, NULL, host(s.ip_address),
         CASE WHEN s.ended_at IS NULL AND s.expires_at > now() THEN 'Open now'
              WHEN s.ended_by = 'admin' THEN 'Ended by an administrator'
              WHEN s.ended_by = 'patient' THEN 'Ended by the patient'
              WHEN s.ended_by = 'provider' THEN 'Ended by the doctor'
              WHEN s.ended_by = 'replaced' THEN 'Replaced by a newer session'
              ELSE 'Ran out after an hour' END, NULL, pr.user_id, pp.user_id
    FROM provider_sessions s
    JOIN provider_profile pr ON pr.provider_id = s.provider_id
    LEFT JOIN users u ON u.user_id = pr.user_id
    JOIN patient_profile pp ON pp.patient_id = s.patient_id
  UNION ALL
  SELECT t.attempted_at, 'pin', CASE WHEN t.succeeded THEN 'Entered the right PIN' ELSE 'Entered a wrong PIN' END,
         CASE WHEN t.succeeded THEN 'ok' ELSE 'failed' END, u.email, pr.first_name || ' ' || pr.last_name, 'provider',
         pp.first_name || ' ' || pp.last_name, pp.patient_code, NULL, host(t.ip_address), NULL, NULL, pr.user_id, pp.user_id
    FROM pin_attempts t
    JOIN patient_profile pp ON pp.patient_id = t.patient_id
    LEFT JOIN provider_profile pr ON pr.provider_id = t.provider_id
    LEFT JOIN users u ON u.user_id = pr.user_id
  UNION ALL
  SELECT y.synced_at, 'sync', 'Phone synced', CASE WHEN y.sync_status = 'success' THEN 'ok' ELSE 'failed' END,
         u.email, pp.first_name || ' ' || pp.last_name, 'patient', pp.first_name || ' ' || pp.last_name, pp.patient_code, NULL, NULL,
         'Sent ' || y.records_pushed || ', received ' || y.records_pulled, NULL, pp.user_id, pp.user_id
    FROM sync_log y
    JOIN patient_profile pp ON pp.patient_id = y.patient_id
    JOIN users u ON u.user_id = pp.user_id
  UNION ALL
  SELECT d.decided_at, 'admin', CASE d.decision WHEN 'verified' THEN 'Verified a doctor' ELSE 'Rejected a doctor' END, 'ok',
         au.email, NULL, 'admin', NULL, NULL, NULL, NULL,
         pr.first_name || ' ' || pr.last_name || ' (' || pr.licence_number || ')' || CASE WHEN d.note IS NOT NULL THEN ': ' || d.note ELSE '' END,
         NULL, d.admin_user_id, NULL
    FROM admin_audit d
    JOIN provider_profile pr ON pr.provider_id = d.provider_id
    LEFT JOIN users au ON au.user_id = d.admin_user_id
  UNION ALL
  SELECT x.occurred_at, 'admin',
         CASE x.action WHEN 'suspend' THEN 'Suspended an account' WHEN 'reactivate' THEN 'Reactivated an account' WHEN 'delete' THEN 'Deleted an account' WHEN 'create_admin' THEN 'Created an administrator' ELSE 'Signed out all phones of an account' END, 'ok',
         au.email, NULL, 'admin', NULL, NULL, NULL, NULL,
         x.target_email || CASE WHEN x.note IS NOT NULL THEN ': ' || x.note ELSE '' END, NULL, x.admin_user_id, NULL
    FROM admin_user_actions x
    LEFT JOIN users au ON au.user_id = x.admin_user_id`;

const CATEGORIES = ['login', 'record', 'session', 'pin', 'sync', 'admin'];

async function activity({ category, result, q, user, from, to, limit, offset }) {
  const lim = clampInt(limit, 50, 500);
  const off = Math.max(parseInt(offset, 10) || 0, 0);
  const where = [];
  const args = [];
  if (category && category !== 'all') {
    if (!CATEGORIES.includes(category)) throw new AppError(400, 'Unknown activity type.');
    where.push(`category = $${args.push(category)}`);
  }
  if (result === 'ok' || result === 'failed') where.push(`result = $${args.push(result)}`);
  if (user) {
    if (!UUID.test(user)) throw new AppError(400, 'Unknown user.');
    where.push(`(actor_id = $${args.push(user)} OR patient_user_id = $${args.length})`);
  }
  if (from) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new AppError(400, 'Dates must look like 2026-11-26.');
    where.push(`at >= $${args.push(from)}::date`);
  }
  if (to) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new AppError(400, 'Dates must look like 2026-11-26.');
    where.push(`at < ($${args.push(to)}::date + 1)`);
  }
  if (q && String(q).trim()) {
    const p = `$${args.push(likeOf(q))}`;
    where.push(`(actor_email ILIKE ${p} ESCAPE '\\' OR actor_name ILIKE ${p} ESCAPE '\\' OR patient_name ILIKE ${p} ESCAPE '\\' OR patient_code ILIKE ${p} ESCAPE '\\' OR ip ILIKE ${p} ESCAPE '\\')`);
  }
  const { rows } = await pool.query(
    `SELECT at, category, action, result, actor_email, actor_name, actor_role, patient_name, patient_code, record_type, ip, detail, source
       FROM (${FEED}) feed ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY at DESC LIMIT ${lim + 1} OFFSET ${off}`,
    args,
  );
  return { events: rows.slice(0, lim), has_more: rows.length > lim };
}

// ---- Security flags -------------------------------------------------------------------------------

async function security() {
  const T = THRESHOLDS;
  const flags = [];
  const push = (f) => flags.push(f);

  const failed = await pool.query(
    `SELECT email, count(*)::int AS n, max(occurred_at) AS last_at, count(DISTINCT ip_address)::int AS ips
       FROM login_events WHERE NOT success AND occurred_at > now() - interval '${T.windowHours} hours'
      GROUP BY email HAVING count(*) >= $1 ORDER BY n DESC LIMIT 50`,
    [T.failedLogins],
  );
  for (const r of failed.rows) push({ kind: 'failed_logins', severity: r.n >= T.failedLogins * 3 ? 'high' : 'medium', title: 'Repeated failed logins', subject: r.email, detail: `${r.n} failed attempts in ${T.windowHours} hours from ${r.ips} address${r.ips === 1 ? '' : 'es'}.`, at: r.last_at, count: r.n });

  const pins = await pool.query(
    `SELECT u.email, pr.first_name || ' ' || pr.last_name AS name, count(*)::int AS n, count(DISTINCT t.patient_id)::int AS patients, max(t.attempted_at) AS last_at
       FROM pin_attempts t JOIN provider_profile pr ON pr.provider_id = t.provider_id JOIN users u ON u.user_id = pr.user_id
      WHERE NOT t.succeeded AND t.attempted_at > now() - interval '${T.windowHours} hours'
      GROUP BY u.email, pr.first_name, pr.last_name HAVING count(*) >= $1 ORDER BY n DESC LIMIT 50`,
    [T.failedPins],
  );
  for (const r of pins.rows) push({ kind: 'failed_pins', severity: r.patients > 1 ? 'high' : 'medium', title: 'Many wrong PINs by a doctor', subject: `${r.email} (Dr ${r.name})`, detail: `${r.n} wrong PINs in ${T.windowHours} hours, across ${r.patients} patient${r.patients === 1 ? '' : 's'}.`, at: r.last_at, count: r.n });

  const many = await pool.query(
    `SELECT u.email, pr.first_name || ' ' || pr.last_name AS name, s.started_at::date AS day, count(DISTINCT s.patient_id)::int AS n, max(s.started_at) AS last_at
       FROM provider_sessions s JOIN provider_profile pr ON pr.provider_id = s.provider_id JOIN users u ON u.user_id = pr.user_id
      WHERE s.started_at > now() - interval '7 days'
      GROUP BY u.email, pr.first_name, pr.last_name, s.started_at::date HAVING count(DISTINCT s.patient_id) >= $1
      ORDER BY n DESC LIMIT 50`,
    [T.patientsPerDoctorPerDay],
  );
  for (const r of many.rows) push({ kind: 'many_patients', severity: 'medium', title: 'A doctor opened many patients in one day', subject: `${r.email} (Dr ${r.name})`, detail: `${r.n} different patients on ${String(r.day).slice(0, 10)}.`, at: r.last_at, count: r.n });

  const suspended = await pool.query(
    `SELECT email, count(*)::int AS n, max(occurred_at) AS last_at FROM login_events
      WHERE reason = 'suspended' AND occurred_at > now() - interval '${T.resetDays} days' GROUP BY email ORDER BY n DESC LIMIT 50`,
  );
  for (const r of suspended.rows) push({ kind: 'suspended_login', severity: 'medium', title: 'A suspended account tried to log in', subject: r.email, detail: `${r.n} attempt${r.n === 1 ? '' : 's'} in ${T.resetDays} days.`, at: r.last_at, count: r.n });

  const resets = await pool.query(
    `SELECT pp.first_name || ' ' || pp.last_name AS name, pp.patient_code, r.revoked_at
       FROM record_shares r JOIN patient_profile pp ON pp.patient_id = r.patient_id
      WHERE r.standing AND r.revoked_at > now() - interval '${T.resetDays} days' ORDER BY r.revoked_at DESC LIMIT 50`,
  );
  for (const r of resets.rows) push({ kind: 'qr_reset', severity: 'info', title: 'A patient reset their permanent QR code', subject: `${r.name}${r.patient_code ? ` (${r.patient_code})` : ''}`, detail: 'The old QR code stopped working. This is normal after a lost card or a shared photo.', at: r.revoked_at, count: 1 });

  const rank = { high: 0, medium: 1, info: 2 };
  flags.sort((a, b) => rank[a.severity] - rank[b.severity] || new Date(b.at) - new Date(a.at));
  return { flags, thresholds: T };
}

module.exports = { admins, createAdmin, deleteUser, overview, users, userDetail, setStatus, revokeDevices, doctorActivity, activity, security, THRESHOLDS };
