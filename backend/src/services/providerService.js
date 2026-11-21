const pool = require('../config/db');
const AppError = require('../utils/AppError');

const dto = (r) => ({
  provider_id: r.provider_id,
  first_name: r.first_name,
  last_name: r.last_name,
  licence_number: r.licence_number,
  facility_name: r.facility_name,
  specialty: r.specialty,
  verification_status: r.verification_status,
  verification_note: r.verification_note,
  verified_at: r.verified_at,
  created_at: r.created_at,
});

// The doctor's own profile and whether an admin has verified them yet.
async function getMe(userId) {
  const { rows } = await pool.query(
    `SELECT p.*, u.email FROM provider_profile p JOIN users u ON u.user_id = p.user_id WHERE p.user_id = $1`,
    [userId],
  );
  if (!rows[0]) throw new AppError(404, 'Doctor profile not found.');
  return { ...dto(rows[0]), email: rows[0].email };
}

// For the admin: doctors waiting for a decision (or any status).
async function listForAdmin(status) {
  const { rows } = await pool.query(
    `SELECT p.*, u.email FROM provider_profile p JOIN users u ON u.user_id = p.user_id
      WHERE ($1::text IS NULL OR p.verification_status = $1) ORDER BY p.created_at`,
    [status],
  );
  return rows.map((r) => ({ ...dto(r), email: r.email }));
}

// An admin verifies or rejects a doctor. The decision can be changed later (for example if a
// licence is withdrawn), and who decided and when is kept.
async function review(adminUserId, providerId, { decision, note }) {
  // An id that is not even shaped like one cannot match a doctor.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providerId)) throw new AppError(404, 'Doctor not found.');
  const { rows } = await pool.query(
    `UPDATE provider_profile
        SET verification_status = $2, verification_note = $3, verified_by = $4, verified_at = now()
      WHERE provider_id = $1 RETURNING *`,
    [providerId, decision, note, adminUserId],
  );
  if (!rows[0]) throw new AppError(404, 'Doctor not found.');
  return dto(rows[0]);
}

module.exports = { getMe, listForAdmin, review };
