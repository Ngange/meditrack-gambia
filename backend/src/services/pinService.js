const argon2 = require('argon2');
const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { generatePatientCode, normalisePatientCode } = require('../utils/patientCode');
const { withPatientLock } = require('./patientService');

const MAX_FAILED = 5;
const LOCK_MINUTES = 30;

// What the patient sees for any failed try. It is the same for an unknown code, a wrong PIN and a
// patient who has not set a PIN, so a doctor cannot use it to find out which codes exist.
const MISMATCH = () => new AppError(400, 'That code and PIN do not match.');

// Hashed once so that an unknown code costs the same time as a wrong PIN.
let dummyHash;
const getDummyHash = async () => (dummyHash ??= await argon2.hash('000000'));

// The patient's code, made the first time it is needed. A collision with another patient's code
// (1 in 100 million) just tries again.
async function ensureCode(patientId) {
  for (let i = 0; i < 10; i++) {
    const existing = await pool.query('SELECT patient_code FROM patient_profile WHERE patient_id = $1', [patientId]);
    if (existing.rows[0]?.patient_code) return existing.rows[0].patient_code;
    try {
      await pool.query('UPDATE patient_profile SET patient_code = $2 WHERE patient_id = $1 AND patient_code IS NULL', [
        patientId,
        generatePatientCode(),
      ]);
    } catch (err) {
      if (err.code !== '23505') throw err;
    }
  }
  throw new Error('Could not make a patient code.');
}

// What the patient's "Show my PIN to a doctor" screen needs. The PIN itself is never returned.
async function getAccess(patientId) {
  const code = await ensureCode(patientId);
  const { rows } = await pool.query(
    `SELECT pin_hash IS NOT NULL AS has_pin, pin_set_at,
            CASE WHEN pin_locked_until > now() THEN pin_locked_until END AS locked_until
       FROM patient_profile WHERE patient_id = $1`,
    [patientId],
  );
  return { patient_code: code, has_pin: rows[0].has_pin, pin_set_at: rows[0].pin_set_at, locked_until: rows[0].locked_until };
}

// Sets or changes the PIN. The account password is required, so someone holding a logged-in phone
// cannot quietly choose a PIN of their own. A new PIN also ends any lockout.
async function setPin(userId, patientId, { pin, password }) {
  const user = await pool.query('SELECT password_hash FROM users WHERE user_id = $1', [userId]);
  if (!user.rows[0] || !(await argon2.verify(user.rows[0].password_hash, password))) {
    // 400, not 401/403: those make the apps sign the user out.
    throw new AppError(400, 'Your password is not correct.');
  }
  const hash = await argon2.hash(pin);
  await ensureCode(patientId);
  await withPatientLock(patientId, (client) =>
    client.query(
      `UPDATE patient_profile
          SET pin_hash = $2, pin_set_at = now(), pin_failed_count = 0, pin_locked_until = NULL
        WHERE patient_id = $1`,
      [patientId, hash],
    ),
  );
  return getAccess(patientId);
}

// Checks a code and PIN typed by a doctor. Returns { patientId } or throws.
// Everything for one patient runs under that patient's lock, so five guesses sent at the same
// moment are counted one after another and cannot all slip in before the lockout.
async function verify({ code, pin, providerId = null, ip = null }) {
  const normalised = normalisePatientCode(code);
  const found = normalised
    ? await pool.query('SELECT patient_id FROM patient_profile WHERE patient_code = $1', [normalised])
    : { rows: [] };

  if (found.rows.length === 0) {
    await argon2.verify(await getDummyHash(), String(pin ?? '')).catch(() => false);
    throw MISMATCH();
  }
  const patientId = found.rows[0].patient_id;

  const outcome = await withPatientLock(patientId, async (client) => {
    const { rows } = await client.query(
      `SELECT pin_hash, pin_failed_count,
              CASE WHEN pin_locked_until > now() THEN CEIL(EXTRACT(EPOCH FROM (pin_locked_until - now())) / 60)::int END AS locked_minutes
         FROM patient_profile WHERE patient_id = $1`,
      [patientId],
    );
    const p = rows[0];
    const log = (succeeded) =>
      client.query('INSERT INTO pin_attempts (patient_id, provider_id, succeeded, ip_address) VALUES ($1, $2, $3, $4)', [
        patientId,
        providerId,
        succeeded,
        cleanIp(ip),
      ]);

    // Locked: do not even check the PIN, so a correct guess cannot get in early.
    if (p.locked_minutes) {
      await log(false);
      return { locked: p.locked_minutes };
    }

    const ok = p.pin_hash ? await argon2.verify(p.pin_hash, String(pin ?? '')).catch(() => false) : false;
    if (!p.pin_hash) await argon2.verify(await getDummyHash(), String(pin ?? '')).catch(() => false);

    if (!ok) {
      const failed = p.pin_failed_count + 1;
      const locks = failed >= MAX_FAILED;
      await client.query(
        `UPDATE patient_profile
            SET pin_failed_count = $2, pin_locked_until = CASE WHEN $3 THEN now() + make_interval(mins => $4) END
          WHERE patient_id = $1`,
        [patientId, locks ? 0 : failed, locks, LOCK_MINUTES],
      );
      await log(false);
      return { wrong: true };
    }

    await client.query('UPDATE patient_profile SET pin_failed_count = 0 WHERE patient_id = $1', [patientId]);
    await log(true);
    return { patientId };
  });

  // Errors are raised only after the transaction has committed, so a failed try is still counted.
  if (outcome.locked) {
    throw new AppError(423, `Access to this patient is locked for about ${outcome.locked} more minutes after too many wrong PINs.`);
  }
  if (outcome.wrong) throw MISMATCH();
  return outcome;
}

const cleanIp = (ip) => {
  if (!ip) return null;
  const plain = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  return /^[0-9a-fA-F:.]+$/.test(plain) ? plain : null;
};

module.exports = { getAccess, setPin, verify, MAX_FAILED, LOCK_MINUTES };
