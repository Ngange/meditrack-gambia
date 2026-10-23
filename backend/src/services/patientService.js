const pool = require('../config/db');

// The JWT carries user_id; records hang off patient_id. Resolve it server-side
// so the client can never choose whose records it touches.
async function getPatientId(userId) {
  const result = await pool.query(
    'SELECT patient_id FROM patient_profile WHERE user_id = $1',
    [userId],
  );
  return result.rows.length ? result.rows[0].patient_id : null;
}

// Runs work(client) in a transaction holding a per-patient advisory lock, so two saves
// arriving at the same moment (phone + web, or a double tap) cannot both pass a duplicate check.
// If work throws, the transaction is rolled back and the error is passed on.
async function withPatientLock(patientId, work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1::text))', [
      patientId,
    ]);
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

module.exports = { getPatientId, withPatientLock };
