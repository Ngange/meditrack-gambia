const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Every route in this file requires a valid token — applying requireAuth
// once here, rather than repeating it on each route individually.
router.use(requireAuth);

router.get('/me', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT patient_id, first_name, last_name, date_of_birth, gender,
              blood_group, emergency_contact_name, emergency_contact_phone
       FROM patient_profile WHERE user_id = $1`,
      [req.user.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient profile not found.' });
    }

    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Could not load profile.' });
  }
});

router.put('/me', async (req, res) => {
  const {
    firstName,
    lastName,
    dateOfBirth,
    gender,
    bloodGroup,
    emergencyContactName,
    emergencyContactPhone,
  } = req.body;

  if (!firstName || !lastName) {
    return res
      .status(400)
      .json({ error: 'First name and last name are required.' });
  }

  try {
    const result = await pool.query(
      `UPDATE patient_profile
       SET first_name = $1, last_name = $2, date_of_birth = $3, gender = $4,
           blood_group = $5, emergency_contact_name = $6, emergency_contact_phone = $7
       WHERE user_id = $8
       RETURNING patient_id, first_name, last_name, date_of_birth, gender,
                 blood_group, emergency_contact_name, emergency_contact_phone`,
      [
        firstName,
        lastName,
        dateOfBirth || null,
        gender || null,
        bloodGroup || null,
        emergencyContactName || null,
        emergencyContactPhone || null,
        req.user.userId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient profile not found.' });
    }

    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Could not update profile.' });
  }
});

module.exports = router;
