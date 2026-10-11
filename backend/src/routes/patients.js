const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Every route in this file requires a valid token — applying requireAuth
// once here, rather than repeating it on each route individually.
router.use(requireAuth);

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// date_of_birth is a plain SQL DATE. node-pg would turn it into a JS Date, which can
// shift by a day across timezones, so we ask Postgres for plain text ("YYYY-MM-DD").
const PROFILE_COLUMNS = `p.patient_id, p.first_name, p.last_name, p.date_of_birth::text AS date_of_birth,
  p.gender, p.blood_group, p.emergency_contact_name, p.emergency_contact_phone`;

// The profile plus the account email, which lives in the users table.
async function fetchProfile(userId) {
  const result = await pool.query(
    `SELECT ${PROFILE_COLUMNS}, u.email
     FROM patient_profile p
     JOIN users u ON u.user_id = p.user_id
     WHERE p.user_id = $1`,
    [userId],
  );
  return result.rows[0] || null;
}

function isRealDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function validateProfile(body) {
  const clean = (v) => (typeof v === 'string' ? v.trim() : '');
  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  const dateOfBirth = clean(body.dateOfBirth);
  const gender = clean(body.gender);
  const bloodGroup = clean(body.bloodGroup);
  const contactName = clean(body.emergencyContactName);
  const contactPhone = clean(body.emergencyContactPhone);

  if (!firstName || !lastName)
    return { error: 'First name and last name are required.' };
  if (firstName.length > 100 || lastName.length > 100) {
    return { error: 'Names are too long (max 100 characters).' };
  }
  if (dateOfBirth) {
    if (!isRealDate(dateOfBirth)) {
      return {
        error: 'Date of birth must be a real date in YYYY-MM-DD format.',
      };
    }
    if (dateOfBirth > new Date().toISOString().slice(0, 10)) {
      return { error: 'Date of birth cannot be in the future.' };
    }
    if (dateOfBirth < '1900-01-01')
      return { error: 'Date of birth is too far in the past.' };
  }
  if (bloodGroup && !BLOOD_GROUPS.includes(bloodGroup)) {
    return { error: `Blood group must be one of ${BLOOD_GROUPS.join(', ')}.` };
  }
  if (gender.length > 20)
    return { error: 'Gender is too long (max 20 characters).' };
  if (contactName.length > 150)
    return {
      error: 'Emergency contact name is too long (max 150 characters).',
    };
  if (contactPhone.length > 30)
    return {
      error: 'Emergency contact phone is too long (max 30 characters).',
    };

  return {
    value: {
      firstName,
      lastName,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      bloodGroup: bloodGroup || null,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
    },
  };
}

router.get('/me', async (req, res) => {
  try {
    const profile = await fetchProfile(req.user.userId);
    if (!profile)
      return res.status(404).json({ error: 'Patient profile not found.' });
    res.json({ profile });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Could not load profile.' });
  }
});

router.put('/me', async (req, res) => {
  const { error, value } = validateProfile(req.body || {});
  if (error) return res.status(400).json({ error });

  try {
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
        req.user.userId,
      ],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Patient profile not found.' });
    }

    res.json({ profile: await fetchProfile(req.user.userId) });
  } catch (err) {
    // 23514 = a CHECK constraint rejected a value, 22001 = a value is longer than its column allows.
    if (err.code === '23514' || err.code === '22001') {
      return res.status(400).json({
        error: 'One of the values was not accepted. Please check your entries.',
      });
    }
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Could not update profile.' });
  }
});

module.exports = router;
