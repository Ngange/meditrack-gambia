const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { encrypt, decrypt } = require('../services/encryption');

const router = express.Router();

// Every records route needs a logged-in patient. Admins have no record access.
router.use(requireAuth, requireRole('patient'));

const SEVERITIES = ['mild', 'moderate', 'severe'];
const STATUSES = ['active', 'resolved'];

// The JWT carries user_id; records hang off patient_id. Resolve it server-side
// so the client can never choose whose records it touches.
async function getPatientId(userId) {
  const result = await pool.query(
    'SELECT patient_id FROM patient_profile WHERE user_id = $1',
    [userId],
  );
  return result.rows.length ? result.rows[0].patient_id : null;
}

function toAllergy(row) {
  return {
    allergy_id: row.allergy_id,
    allergen: decrypt(row.allergen_enc),
    reaction: decrypt(row.reaction_enc),
    severity: row.severity,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const ALLERGY_COLUMNS =
  'allergy_id, allergen_enc, reaction_enc, severity, status, created_at, updated_at';

function validateAllergy(body) {
  const allergen =
    typeof body.allergen === 'string' ? body.allergen.trim() : '';
  const reaction =
    typeof body.reaction === 'string' ? body.reaction.trim() : '';
  if (!allergen) return { error: 'Allergen is required.' };
  if (allergen.length > 200)
    return { error: 'Allergen is too long (max 200 characters).' };
  if (reaction.length > 1000)
    return { error: 'Reaction is too long (max 1000 characters).' };
  if (body.severity && !SEVERITIES.includes(body.severity)) {
    return { error: 'Severity must be mild, moderate or severe.' };
  }
  if (body.status && !STATUSES.includes(body.status)) {
    return { error: 'Status must be active or resolved.' };
  }
  return {
    value: {
      allergen,
      reaction: reaction || null,
      severity: body.severity || null,
      status: body.status || 'active',
    },
  };
}

router.get('/allergies', async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.userId);
    if (!patientId)
      return res.status(404).json({ error: 'Patient profile not found.' });

    const result = await pool.query(
      `SELECT ${ALLERGY_COLUMNS} FROM allergies
       WHERE patient_id = $1 ORDER BY created_at DESC`,
      [patientId],
    );
    res.json({ allergies: result.rows.map(toAllergy) });
  } catch (err) {
    console.error('List allergies error:', err);
    res.status(500).json({ error: 'Could not load allergies.' });
  }
});

router.post('/allergies', async (req, res) => {
  const { error, value } = validateAllergy(req.body || {});
  if (error) return res.status(400).json({ error });

  try {
    const patientId = await getPatientId(req.user.userId);
    if (!patientId)
      return res.status(404).json({ error: 'Patient profile not found.' });

    const result = await pool.query(
      `INSERT INTO allergies (patient_id, allergen_enc, reaction_enc, severity, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${ALLERGY_COLUMNS}`,
      [
        patientId,
        encrypt(value.allergen),
        encrypt(value.reaction),
        value.severity,
        value.status,
      ],
    );
    res.status(201).json({ allergy: toAllergy(result.rows[0]) });
  } catch (err) {
    console.error('Create allergy error:', err);
    res.status(500).json({ error: 'Could not save allergy.' });
  }
});

router.put('/allergies/:id', async (req, res) => {
  const { error, value } = validateAllergy(req.body || {});
  if (error) return res.status(400).json({ error });

  try {
    const patientId = await getPatientId(req.user.userId);
    if (!patientId)
      return res.status(404).json({ error: 'Patient profile not found.' });

    // patient_id in the WHERE clause is what stops one patient editing another's row.
    const result = await pool.query(
      `UPDATE allergies
       SET allergen_enc = $1, reaction_enc = $2, severity = $3, status = $4
       WHERE allergy_id = $5 AND patient_id = $6
       RETURNING ${ALLERGY_COLUMNS}`,
      [
        encrypt(value.allergen),
        encrypt(value.reaction),
        value.severity,
        value.status,
        req.params.id,
        patientId,
      ],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Allergy not found.' });
    res.json({ allergy: toAllergy(result.rows[0]) });
  } catch (err) {
    // 22P02 = malformed UUID in the URL
    if (err.code === '22P02')
      return res.status(404).json({ error: 'Allergy not found.' });
    console.error('Update allergy error:', err);
    res.status(500).json({ error: 'Could not update allergy.' });
  }
});

router.delete('/allergies/:id', async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.userId);
    if (!patientId)
      return res.status(404).json({ error: 'Patient profile not found.' });

    const result = await pool.query(
      'DELETE FROM allergies WHERE allergy_id = $1 AND patient_id = $2 RETURNING allergy_id',
      [req.params.id, patientId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Allergy not found.' });
    res.json({ deleted: true });
  } catch (err) {
    if (err.code === '22P02')
      return res.status(404).json({ error: 'Allergy not found.' });
    console.error('Delete allergy error:', err);
    res.status(500).json({ error: 'Could not delete allergy.' });
  }
});

module.exports = router;
