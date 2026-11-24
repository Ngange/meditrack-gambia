const crypto = require('crypto');
const pool = require('../config/db');
const AppError = require('../utils/AppError');

// A "device key" lets one phone get a fresh login token on its own after being offline, so the
// patient is not asked to sign in again just because the phone was away. Rules:
//   - It is issued only at a real sign-in (email + password), never on its own.
//   - Only its SHA-256 is stored. It is long and random, so a plain hash is enough.
//   - Every use replaces it with a new one. The previous key still works for a few minutes, so a
//     response lost on a bad connection does not lock the phone out.
//   - It stops working 90 days after the phone last used it (checked only when the phone asks, so
//     being offline never expires anything), when revoked, or when the account is suspended.
const MAX_DEVICES = 10;
const IDLE_DAYS = 90;
const GRACE_MINUTES = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const newSecret = () => crypto.randomBytes(32).toString('base64url');
const same = (a, b) => !!a && !!b && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Every failure looks the same, so the message cannot be used to learn whether a device exists.
// 400, not 401/403: those make the apps sign the user out.
const signInAgain = () => new AppError(400, 'Sign in again to sync.');

function parseKey(deviceKey) {
  if (typeof deviceKey !== 'string' || deviceKey.length > 200) return null;
  const dot = deviceKey.indexOf('.');
  if (dot < 0) return null;
  const deviceId = deviceKey.slice(0, dot);
  const secret = deviceKey.slice(dot + 1);
  return UUID.test(deviceId) && secret ? { deviceId, secret } : null;
}

async function inTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Called right after a successful sign-in from the phone. If the phone already holds a key that is
// still good for this patient, that device record is reused (and the key replaced); otherwise a new
// device is recorded. Returns { device_id, device_key }, or null if the sign-in did not come from
// an Android phone.
async function issue(patientId, { name, platform, deviceKey } = {}) {
  if (platform !== 'android') return null;
  return inTransaction(async (client) => {
    const secret = newSecret();
    const parsed = parseKey(deviceKey);
    if (parsed) {
      const found = await client.query(
        'SELECT key_hash, prev_key_hash, prev_key_valid_until FROM devices WHERE device_id = $1 AND patient_id = $2 AND revoked_at IS NULL FOR UPDATE',
        [parsed.deviceId, patientId],
      );
      const d = found.rows[0];
      const given = sha(parsed.secret);
      if (d && (same(d.key_hash, given) || (same(d.prev_key_hash, given) && new Date(d.prev_key_valid_until) > new Date()))) {
        await client.query(
          `UPDATE devices SET key_hash = $2, prev_key_hash = $3, prev_key_valid_until = now() + make_interval(mins => $4),
                  device_name = COALESCE($5, device_name), last_seen_at = now()
            WHERE device_id = $1`,
          [parsed.deviceId, sha(secret), d.key_hash, GRACE_MINUTES, name ?? null],
        );
        return { device_id: parsed.deviceId, device_key: `${parsed.deviceId}.${secret}` };
      }
    }
    // A new phone. At the limit, the phone unused for longest is dropped to make room.
    const active = await client.query('SELECT device_id FROM devices WHERE patient_id = $1 AND revoked_at IS NULL ORDER BY last_seen_at ASC', [patientId]);
    const surplus = active.rows.length - (MAX_DEVICES - 1);
    for (const row of active.rows.slice(0, Math.max(0, surplus))) {
      await client.query('UPDATE devices SET revoked_at = now(), key_hash = NULL, prev_key_hash = NULL WHERE device_id = $1', [row.device_id]);
    }
    const inserted = await client.query(
      `INSERT INTO devices (patient_id, platform, device_name, key_hash) VALUES ($1, 'android', $2, $3) RETURNING device_id`,
      [patientId, name ?? null, sha(secret)],
    );
    const id = inserted.rows[0].device_id;
    return { device_id: id, device_key: `${id}.${secret}` };
  });
}

// The phone presents its key. Returns the account (so the caller can sign a token) and the
// replacement key, or throws the same "Sign in again to sync." for every kind of failure.
async function refresh(deviceKey) {
  const parsed = parseKey(deviceKey);
  if (!parsed) throw signInAgain();
  return inTransaction(async (client) => {
    const found = await client.query(
      `SELECT d.device_id, d.patient_id, d.key_hash, d.prev_key_hash, d.prev_key_valid_until, d.revoked_at,
              (d.last_seen_at > now() - make_interval(days => $2)) AS recent,
              u.user_id, u.email, u.role, u.status
         FROM devices d
         JOIN patient_profile p ON p.patient_id = d.patient_id
         JOIN users u ON u.user_id = p.user_id
        WHERE d.device_id = $1 FOR UPDATE OF d`,
      [parsed.deviceId, IDLE_DAYS],
    );
    const d = found.rows[0];
    if (!d || d.revoked_at || !d.recent || d.status !== 'active' || d.role !== 'patient') throw signInAgain();

    const given = sha(parsed.secret);
    const isCurrent = same(d.key_hash, given);
    const isPrevious = !isCurrent && same(d.prev_key_hash, given) && new Date(d.prev_key_valid_until) > new Date();
    if (!isCurrent && !isPrevious) throw signInAgain();

    const secret = newSecret();
    // Using the current key makes it the "previous" one. Using the previous key (its replacement was
    // probably lost on the way) keeps that same previous key alive a little longer, so the phone is
    // never left holding a key that has stopped working.
    await client.query(
      `UPDATE devices SET key_hash = $2, prev_key_hash = $3, prev_key_valid_until = now() + make_interval(mins => $4), last_seen_at = now()
        WHERE device_id = $1`,
      [d.device_id, sha(secret), isCurrent ? d.key_hash : d.prev_key_hash, GRACE_MINUTES],
    );
    return {
      user: { user_id: d.user_id, email: d.email, role: d.role },
      device_id: d.device_id,
      device_key: `${d.device_id}.${secret}`,
    };
  });
}

// A device the patient can use to sync right now (used by the sync endpoint). Also marks it seen.
async function assertActive(patientId, deviceId) {
  if (typeof deviceId !== 'string' || !UUID.test(deviceId)) throw signInAgain();
  const { rows } = await pool.query(
    'UPDATE devices SET last_seen_at = now() WHERE device_id = $1 AND patient_id = $2 AND revoked_at IS NULL RETURNING device_id',
    [deviceId, patientId],
  );
  if (!rows[0]) throw signInAgain();
}

async function list(patientId) {
  const { rows } = await pool.query(
    'SELECT device_id, device_name, last_seen_at, created_at FROM devices WHERE patient_id = $1 AND revoked_at IS NULL ORDER BY last_seen_at DESC',
    [patientId],
  );
  return rows;
}

// Revoking twice is fine. Another patient's device is "not found".
async function revoke(patientId, deviceId) {
  if (!UUID.test(String(deviceId))) throw new AppError(404, 'Device not found.');
  const found = await pool.query('SELECT 1 FROM devices WHERE device_id = $1 AND patient_id = $2', [deviceId, patientId]);
  if (!found.rows[0]) throw new AppError(404, 'Device not found.');
  await pool.query('UPDATE devices SET revoked_at = COALESCE(revoked_at, now()), key_hash = NULL, prev_key_hash = NULL WHERE device_id = $1', [deviceId]);
}

async function revokeAll(patientId) {
  const { rowCount } = await pool.query(
    'UPDATE devices SET revoked_at = now(), key_hash = NULL, prev_key_hash = NULL WHERE patient_id = $1 AND revoked_at IS NULL',
    [patientId],
  );
  return rowCount;
}

// For a password change (not built yet: call this from it) or any other "sign out everywhere".
async function revokeAllForUser(userId) {
  const { rowCount } = await pool.query(
    `UPDATE devices SET revoked_at = now(), key_hash = NULL, prev_key_hash = NULL
      WHERE revoked_at IS NULL AND patient_id IN (SELECT patient_id FROM patient_profile WHERE user_id = $1)`,
    [userId],
  );
  return rowCount;
}

module.exports = { issue, refresh, assertActive, list, revoke, revokeAll, revokeAllForUser, IDLE_DAYS, MAX_DEVICES };
