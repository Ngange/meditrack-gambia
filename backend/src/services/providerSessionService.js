const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { withPatientLock } = require('./patientService');
const pinService = require('./pinService');
const { hashToken, looksLikeToken } = require('../utils/shareToken');
const audit = require('./auditService');

const SESSION_MINUTES = 60;
const ACTIVE = 'ended_at IS NULL AND expires_at > now()';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A doctor may only open records once an admin has verified them, and this is checked on every
// request, so a doctor whose verification is withdrawn loses access at once.
// 400/410, never 401/403: those make the apps sign the user out.
async function assertVerified(providerId) {
  const { rows } = await pool.query('SELECT verification_status FROM provider_profile WHERE provider_id = $1', [providerId]);
  if (rows[0]?.verification_status !== 'verified') {
    throw new AppError(400, 'Your licence has not been verified, so you cannot open patient records.');
  }
}

const toDto = (r) => ({
  session_id: r.session_id,
  started_at: r.started_at,
  expires_at: r.expires_at,
  patient: { first_name: r.first_name, last_name: r.last_name, blood_group: r.blood_group },
});

const SESSION_SELECT = `SELECT s.session_id, s.started_at, s.expires_at, s.patient_id, p.first_name, p.last_name, p.blood_group
                          FROM provider_sessions s JOIN patient_profile p ON p.patient_id = s.patient_id`;

// Starts one hour with a patient. One live session per doctor and patient: opening again replaces the old one.
async function startSession({ providerId, userId, patientId, via, ip }) {
  const sessionId = await withPatientLock(patientId, async (client) => {
    await client.query(
      `UPDATE provider_sessions SET ended_at = now(), ended_by = 'replaced'
        WHERE provider_id = $1 AND patient_id = $2 AND ${ACTIVE}`,
      [providerId, patientId],
    );
    const inserted = await client.query(
      `INSERT INTO provider_sessions (provider_id, patient_id, expires_at, ip_address, opened_via)
       VALUES ($1, $2, now() + make_interval(mins => $3), $4, $5) RETURNING session_id`,
      [providerId, patientId, SESSION_MINUTES, audit.cleanIp(ip), via],
    );
    return inserted.rows[0].session_id;
  });

  await audit.record({ patientId, actorType: 'provider', actorId: userId, action: 'view', recordType: 'access_session', ip });
  const { rows } = await pool.query(`${SESSION_SELECT} WHERE s.session_id = $1`, [sessionId]);
  return toDto(rows[0]);
}

// The doctor types a patient's code and PIN. If right, they get one hour with that patient.
async function open({ providerId, userId, code, pin, ip }) {
  await assertVerified(providerId);
  // Counts wrong tries, locks after 5, and logs every attempt (see pinService).
  const { patientId } = await pinService.verify({ code, pin, providerId, ip });
  return startSession({ providerId, userId, patientId, via: 'pin', ip });
}

// The doctor scans the patient's permanent QR code. The QR is the patient's own choice to be reachable by a
// scan alone, so there is no PIN; the doctor must still be a verified doctor, the hour is the same, every
// change is logged under the doctor's name, and the patient sees "by scanning your QR code". A QR that was
// reset, or that never existed, gets the same answer.
async function openByQr({ providerId, userId, token, ip }) {
  await assertVerified(providerId);
  const invalid = () => new AppError(404, 'This QR code is not valid any more. Ask the patient to show their current one.');
  if (!looksLikeToken(token)) throw invalid();
  const found = await pool.query(
    `UPDATE record_shares SET view_count = view_count + 1
      WHERE token_hash = $1 AND standing AND revoked_at IS NULL RETURNING share_id, patient_id`,
    [hashToken(token)],
  );
  const share = found.rows[0];
  if (!share) throw invalid();
  await audit.record({ patientId: share.patient_id, shareId: share.share_id, actorType: 'provider', actorId: userId, action: 'view', recordType: 'share_page', ip });
  return startSession({ providerId, userId, patientId: share.patient_id, via: 'qr', ip });
}

// The doctor's open sessions, soonest to run out first.
async function listActive(providerId) {
  const { rows } = await pool.query(`${SESSION_SELECT} WHERE s.provider_id = $1 AND s.ended_at IS NULL AND s.expires_at > now() ORDER BY s.expires_at`, [providerId]);
  return rows.map(toDto);
}

// Finds a session that belongs to this doctor and is still running. Someone else's session, or one
// that never existed, is the same "not found"; one that has run out or been ended says so.
async function getActive(providerId, sessionId) {
  if (!UUID.test(String(sessionId))) throw new AppError(404, 'Session not found.');
  const { rows } = await pool.query(
    `SELECT s.session_id, s.started_at, s.expires_at, s.ended_at, s.patient_id
       FROM provider_sessions s WHERE s.session_id = $1 AND s.provider_id = $2`,
    [sessionId, providerId],
  );
  const s = rows[0];
  if (!s) throw new AppError(404, 'Session not found.');
  if (s.ended_at || new Date(s.expires_at) <= new Date()) {
    throw new AppError(410, "This access has ended. Enter the patient's code and PIN again to continue.");
  }
  return s;
}

// The doctor ends their own session. Ending twice is fine.
async function end(providerId, sessionId) {
  if (!UUID.test(String(sessionId))) throw new AppError(404, 'Session not found.');
  const { rows } = await pool.query(
    `UPDATE provider_sessions SET ended_at = COALESCE(ended_at, now()), ended_by = COALESCE(ended_by, 'provider')
      WHERE session_id = $1 AND provider_id = $2 RETURNING session_id`,
    [sessionId, providerId],
  );
  if (!rows[0]) throw new AppError(404, 'Session not found.');
}

// Everything a doctor may see about the patient themselves.
async function getPatientBasics(patientId) {
  const { rows } = await pool.query(
    `SELECT first_name, last_name, blood_group, date_of_birth::text AS date_of_birth, gender,
            emergency_contact_name, emergency_contact_phone FROM patient_profile WHERE patient_id = $1`,
    [patientId],
  );
  return rows[0];
}

module.exports = { open, openByQr, listActive, getActive, end, getPatientBasics, assertVerified, SESSION_MINUTES };
