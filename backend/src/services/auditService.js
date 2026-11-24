const pool = require('../config/db');

// Express gives IPv4 clients as "::ffff:1.2.3.4"; the INET column wants the plain address.
const cleanIp = (ip) => {
  if (!ip) return null;
  const plain = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  return /^[0-9a-fA-F:.]+$/.test(plain) ? plain : null;
};

// Writes one line to the audit trail: who touched which patient's records, how, and from where.
// The audit trail must never break the action it describes, so a failure here is logged, not thrown.
async function record({ patientId, shareId = null, actorType, actorId = null, action, recordType, ip = null }, db = pool) {
  try {
    await db.query(
      `INSERT INTO audit_logs (patient_id, share_id, actor_type, actor_id, action, record_type, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [patientId, shareId, actorType, actorId, action, recordType, cleanIp(ip)],
    );
  } catch (err) {
    console.error('Could not write audit log:', err.message);
  }
}

module.exports = { record, cleanIp };
