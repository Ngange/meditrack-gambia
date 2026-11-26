const pool = require('../config/db');
const AppError = require('../utils/AppError');
const audit = require('./auditService');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE = 'ended_at IS NULL AND expires_at > now()';
const STREAK_MIN = 3; // a run of this many wrong PINs in a row is worth telling the patient about
const HISTORY_LIMIT = 50;

const doctorName = (r) => (r.first_name ? `Dr ${r.first_name} ${r.last_name}` : 'A doctor whose account was removed');

// Doctors who can open the patient's record right now.
async function listActive(patientId) {
  const { rows } = await pool.query(
    `SELECT s.session_id, s.started_at, s.expires_at, s.opened_via, pr.first_name, pr.last_name, pr.facility_name
       FROM provider_sessions s LEFT JOIN provider_profile pr ON pr.provider_id = s.provider_id
      WHERE s.patient_id = $1 AND s.ended_at IS NULL AND s.expires_at > now()
      ORDER BY s.started_at DESC`,
    [patientId],
  );
  return rows.map((r) => ({
    session_id: r.session_id,
    doctor: doctorName(r),
    facility: r.facility_name ?? null,
    via: r.opened_via,
    started_at: r.started_at,
    expires_at: r.expires_at,
  }));
}

// Past doctor sessions, with how each one ended and how many changes the doctor made during it.
async function sessionEvents(patientId) {
  const { rows } = await pool.query(
    `SELECT s.session_id, s.started_at, s.expires_at, s.ended_at, s.ended_by, s.opened_via,
            pr.first_name, pr.last_name, pr.facility_name,
            (SELECT count(*)::int FROM audit_logs a
              WHERE a.patient_id = s.patient_id AND a.actor_type = 'provider' AND a.actor_id = pr.user_id
                AND a.action IN ('create', 'update')
                AND a.occurred_at >= s.started_at AND a.occurred_at <= COALESCE(s.ended_at, s.expires_at)) AS changes,
            (SELECT count(*)::int FROM audit_logs a
              WHERE a.patient_id = s.patient_id AND a.actor_type = 'provider' AND a.actor_id = pr.user_id
                AND a.action = 'print'
                AND a.occurred_at >= s.started_at AND a.occurred_at <= COALESCE(s.ended_at, s.expires_at)) AS prints
       FROM provider_sessions s LEFT JOIN provider_profile pr ON pr.provider_id = s.provider_id
      WHERE s.patient_id = $1 AND NOT (s.ended_at IS NULL AND s.expires_at > now())
      ORDER BY s.started_at DESC LIMIT $2`,
    [patientId, HISTORY_LIMIT],
  );
  return rows.map((r) => {
    const place = r.facility_name ? `${doctorName(r)}, ${r.facility_name}` : doctorName(r);
    const how = { patient: 'You ended the access.', provider: 'The doctor ended the access.', replaced: 'The doctor opened the record again.' }[r.ended_by] ?? 'The hour ran out.';
    const changes = r.changes ? ` ${r.changes === 1 ? 'They made 1 change.' : `They made ${r.changes} changes.`}` : '';
    const printed = r.prints ? ` They printed your record${r.prints > 1 ? ` ${r.prints} times` : ''}.` : '';
    return { id: `s-${r.session_id}`, type: 'doctor_session', at: r.started_at, title: `${place} opened your record${r.opened_via === 'qr' ? ' by scanning your QR code' : ''}.`, detail: `${how}${changes}${printed}` };
  });
}

// Wrong PINs, shown only when STREAK_MIN or more came one after another (a doctor mistyping once
// or twice is not worth alarming anyone). A correct PIN ends a run.
async function pinStreakEvents(patientId) {
  const { rows } = await pool.query(
    'SELECT succeeded, attempted_at FROM pin_attempts WHERE patient_id = $1 ORDER BY attempted_at ASC, attempt_id ASC LIMIT 500',
    [patientId],
  );
  const events = [];
  let run = [];
  const flush = () => {
    if (run.length >= STREAK_MIN) {
      events.push({
        id: `p-${run[run.length - 1].attempted_at.toISOString?.() ?? run[run.length - 1].attempted_at}`,
        type: 'wrong_pin',
        at: run[run.length - 1].attempted_at,
        title: `${run.length} wrong PIN tries in a row.`,
        detail: run.length >= 5 ? 'Doctor access was locked for 30 minutes. If this was not you or a doctor you know, change your PIN.' : 'If this was not you or a doctor you know, change your PIN.',
      });
    }
    run = [];
  };
  for (const r of rows) (r.succeeded ? flush() : run.push(r));
  flush();
  return events;
}

async function shareEvents(patientId) {
  const { rows } = await pool.query(
    `SELECT a.occurred_at, COALESCE(s.standing, false) AS standing FROM audit_logs a
       LEFT JOIN record_shares s ON s.share_id = a.share_id
      WHERE a.patient_id = $1 AND a.actor_type = 'share_token' AND a.record_type = 'share_page'
      ORDER BY a.occurred_at DESC LIMIT $2`,
    [patientId, HISTORY_LIMIT],
  );
  return rows.map((r, i) => ({ id: `l-${i}-${new Date(r.occurred_at).getTime()}`, type: 'share_link', at: r.occurred_at, title: r.standing ? 'Your permanent QR code was scanned.' : 'One of your share links was opened.', detail: null }));
}

async function get(patientId) {
  const [active, sessions, pins, links] = await Promise.all([listActive(patientId), sessionEvents(patientId), pinStreakEvents(patientId), shareEvents(patientId)]);
  const history = [...sessions, ...pins, ...links].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, HISTORY_LIMIT);
  return { active, history };
}

// The patient ends one doctor's access. Ending twice is fine; someone else's session is "not found".
async function endOne(patientId, sessionId, { userId, ip }) {
  if (!UUID.test(String(sessionId))) throw new AppError(404, 'Session not found.');
  const found = await pool.query('SELECT session_id FROM provider_sessions WHERE session_id = $1 AND patient_id = $2', [sessionId, patientId]);
  if (!found.rows[0]) throw new AppError(404, 'Session not found.');
  const ended = await pool.query(
    `UPDATE provider_sessions SET ended_at = now(), ended_by = 'patient' WHERE session_id = $1 AND patient_id = $2 AND ${ACTIVE} RETURNING session_id`,
    [sessionId, patientId],
  );
  if (ended.rows[0]) await audit.record({ patientId, actorType: 'patient', actorId: userId, action: 'update', recordType: 'access_session', ip });
}

// "End all access": every open doctor session at once. Returns how many were open.
async function endAll(patientId, { userId, ip }) {
  const { rowCount } = await pool.query(
    `UPDATE provider_sessions SET ended_at = now(), ended_by = 'patient' WHERE patient_id = $1 AND ${ACTIVE}`,
    [patientId],
  );
  if (rowCount) await audit.record({ patientId, actorType: 'patient', actorId: userId, action: 'update', recordType: 'access_session', ip });
  return rowCount;
}

module.exports = { get, listActive, endOne, endAll, STREAK_MIN };
