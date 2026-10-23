const pool = require('../config/db');

// date_of_birth is a plain SQL DATE. node-pg would turn it into a JS Date, which can
// shift by a day across timezones, so we ask Postgres for plain text ("YYYY-MM-DD").
const PROFILE_COLUMNS = `p.patient_id, p.first_name, p.last_name, p.date_of_birth::text AS date_of_birth,
  p.gender, p.blood_group, p.emergency_contact_name, p.emergency_contact_phone`;

// The profile plus the account email, which lives in the users table.
async function getProfile(userId) {
  const result = await pool.query(
    `SELECT ${PROFILE_COLUMNS}, u.email
     FROM patient_profile p
     JOIN users u ON u.user_id = p.user_id
     WHERE p.user_id = $1`,
    [userId],
  );
  return result.rows[0] || null;
}

// Returns the updated profile, or null when the user has no profile.
async function updateProfile(userId, value) {
  const result = await pool.query(
    `UPDATE patient_profile
     SET first_name = $1, last_name = $2, date_of_birth = $3, gender = $4,
         blood_group = $5, emergency_contact_name = $6, emergency_contact_phone = $7
     WHERE user_id = $8`,
    [
      value.firstName,
      value.lastName,
      value.dateOfBirth,
      value.gender,
      value.bloodGroup,
      value.contactName,
      value.contactPhone,
      userId,
    ],
  );
  if (result.rowCount === 0) return null;
  return getProfile(userId);
}

module.exports = { getProfile, updateProfile };
