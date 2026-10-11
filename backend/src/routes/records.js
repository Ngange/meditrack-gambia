const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { encrypt, decrypt } = require('../services/encryption');

const router = express.Router();

// Every records route needs a logged-in patient. Admins have no record access.
router.use(requireAuth, requireRole('patient'));

// The JWT carries user_id; records hang off patient_id. Resolve it server-side
// so the client can never choose whose records it touches.
async function getPatientId(userId) {
  const result = await pool.query(
    'SELECT patient_id FROM patient_profile WHERE user_id = $1',
    [userId],
  );
  return result.rows.length ? result.rows[0].patient_id : null;
}

// ---------------------------------------------------------------
// Duplicate protection
// ---------------------------------------------------------------
// Name columns are encrypted with a fresh random IV every time, so the same name
// never produces the same ciphertext and a UNIQUE constraint cannot see duplicates.
// Instead we decrypt this patient's own rows and compare normalised names.
function normalizeName(s) {
  return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

// Runs work(client) in a transaction holding a per-patient advisory lock, so two saves
// arriving at the same moment (phone + web, or a double tap) cannot both pass the check.
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

// spec names are constants defined in this file, never user input.
async function isDuplicate(client, spec, patientId, name, excludeId) {
  const result = await client.query(
    `SELECT ${spec.idCol}, ${spec.nameCol} FROM ${spec.table} WHERE patient_id = $1`,
    [patientId],
  );
  const target = normalizeName(name);
  const skip = excludeId ? String(excludeId).toLowerCase() : null;
  return result.rows.some(
    (r) =>
      String(r[spec.idCol]).toLowerCase() !== skip &&
      normalizeName(decrypt(r[spec.nameCol])) === target,
  );
}

// ---------------------------------------------------------------
// Allergies
// ---------------------------------------------------------------
const SEVERITIES = ['mild', 'moderate', 'severe'];
const STATUSES = ['active', 'resolved'];
const ALLERGY_DUP = {
  table: 'allergies',
  idCol: 'allergy_id',
  nameCol: 'allergen_enc',
};
const ALLERGY_DUP_MSG =
  'This allergy is already in your records. Edit the existing entry instead.';

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

    const outcome = await withPatientLock(patientId, async (client) => {
      if (
        await isDuplicate(client, ALLERGY_DUP, patientId, value.allergen, null)
      ) {
        return { duplicate: true };
      }
      const result = await client.query(
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
      return { row: result.rows[0] };
    });

    if (outcome.duplicate)
      return res.status(409).json({ error: ALLERGY_DUP_MSG });
    res.status(201).json({ allergy: toAllergy(outcome.row) });
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

    const outcome = await withPatientLock(patientId, async (client) => {
      if (
        await isDuplicate(
          client,
          ALLERGY_DUP,
          patientId,
          value.allergen,
          req.params.id,
        )
      ) {
        return { duplicate: true };
      }
      // patient_id in the WHERE clause is what stops one patient editing another's row.
      const result = await client.query(
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
      return { row: result.rows[0] };
    });

    if (outcome.duplicate)
      return res.status(409).json({ error: ALLERGY_DUP_MSG });
    if (!outcome.row)
      return res.status(404).json({ error: 'Allergy not found.' });
    res.json({ allergy: toAllergy(outcome.row) });
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

// ---------------------------------------------------------------
// Medical conditions
// ---------------------------------------------------------------
const CONDITION_STATUSES = ['active', 'resolved', 'chronic'];
const CONDITION_DUP = {
  table: 'medical_conditions',
  idCol: 'condition_id',
  nameCol: 'condition_name_enc',
};
const CONDITION_DUP_MSG =
  'This condition is already in your records. Edit the existing entry instead.';

// diagnosis_date is a plain SQL DATE. node-pg would turn it into a JS Date,
// which can shift by a day across timezones, so we ask Postgres for text.
const CONDITION_COLUMNS = `condition_id, condition_name_enc,
  diagnosis_date::text AS diagnosis_date, status, notes_enc, created_at, updated_at`;

function toCondition(row) {
  return {
    condition_id: row.condition_id,
    condition_name: decrypt(row.condition_name_enc),
    diagnosis_date: row.diagnosis_date,
    status: row.status,
    notes: decrypt(row.notes_enc),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function isRealDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function validateCondition(body) {
  const name =
    typeof body.conditionName === 'string' ? body.conditionName.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const date =
    typeof body.diagnosisDate === 'string' ? body.diagnosisDate.trim() : '';
  if (!name) return { error: 'Condition name is required.' };
  if (name.length > 200)
    return { error: 'Condition name is too long (max 200 characters).' };
  if (notes.length > 2000)
    return { error: 'Notes are too long (max 2000 characters).' };
  if (date) {
    if (!isRealDate(date))
      return {
        error: 'Diagnosis date must be a real date in YYYY-MM-DD format.',
      };
    if (date > new Date().toISOString().slice(0, 10)) {
      return { error: 'Diagnosis date cannot be in the future.' };
    }
  }
  if (body.status && !CONDITION_STATUSES.includes(body.status)) {
    return { error: 'Status must be active, resolved or chronic.' };
  }
  return {
    value: {
      name,
      date: date || null,
      status: body.status || 'active',
      notes: notes || null,
    },
  };
}

router.get('/conditions', async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.userId);
    if (!patientId)
      return res.status(404).json({ error: 'Patient profile not found.' });

    const result = await pool.query(
      `SELECT ${CONDITION_COLUMNS} FROM medical_conditions
       WHERE patient_id = $1
       ORDER BY diagnosis_date DESC NULLS LAST, created_at DESC`,
      [patientId],
    );
    res.json({ conditions: result.rows.map(toCondition) });
  } catch (err) {
    console.error('List conditions error:', err);
    res.status(500).json({ error: 'Could not load conditions.' });
  }
});

router.post('/conditions', async (req, res) => {
  const { error, value } = validateCondition(req.body || {});
  if (error) return res.status(400).json({ error });

  try {
    const patientId = await getPatientId(req.user.userId);
    if (!patientId)
      return res.status(404).json({ error: 'Patient profile not found.' });

    const outcome = await withPatientLock(patientId, async (client) => {
      if (
        await isDuplicate(client, CONDITION_DUP, patientId, value.name, null)
      ) {
        return { duplicate: true };
      }
      const result = await client.query(
        `INSERT INTO medical_conditions
           (patient_id, condition_name_enc, diagnosis_date, status, notes_enc)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${CONDITION_COLUMNS}`,
        [
          patientId,
          encrypt(value.name),
          value.date,
          value.status,
          encrypt(value.notes),
        ],
      );
      return { row: result.rows[0] };
    });

    if (outcome.duplicate)
      return res.status(409).json({ error: CONDITION_DUP_MSG });
    res.status(201).json({ condition: toCondition(outcome.row) });
  } catch (err) {
    console.error('Create condition error:', err);
    res.status(500).json({ error: 'Could not save condition.' });
  }
});

router.put('/conditions/:id', async (req, res) => {
  const { error, value } = validateCondition(req.body || {});
  if (error) return res.status(400).json({ error });

  try {
    const patientId = await getPatientId(req.user.userId);
    if (!patientId)
      return res.status(404).json({ error: 'Patient profile not found.' });

    const outcome = await withPatientLock(patientId, async (client) => {
      if (
        await isDuplicate(
          client,
          CONDITION_DUP,
          patientId,
          value.name,
          req.params.id,
        )
      ) {
        return { duplicate: true };
      }
      const result = await client.query(
        `UPDATE medical_conditions
         SET condition_name_enc = $1, diagnosis_date = $2, status = $3, notes_enc = $4
         WHERE condition_id = $5 AND patient_id = $6
         RETURNING ${CONDITION_COLUMNS}`,
        [
          encrypt(value.name),
          value.date,
          value.status,
          encrypt(value.notes),
          req.params.id,
          patientId,
        ],
      );
      return { row: result.rows[0] };
    });

    if (outcome.duplicate)
      return res.status(409).json({ error: CONDITION_DUP_MSG });
    if (!outcome.row)
      return res.status(404).json({ error: 'Condition not found.' });
    res.json({ condition: toCondition(outcome.row) });
  } catch (err) {
    if (err.code === '22P02')
      return res.status(404).json({ error: 'Condition not found.' });
    console.error('Update condition error:', err);
    res.status(500).json({ error: 'Could not update condition.' });
  }
});

router.delete('/conditions/:id', async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.userId);
    if (!patientId)
      return res.status(404).json({ error: 'Patient profile not found.' });

    const result = await pool.query(
      'DELETE FROM medical_conditions WHERE condition_id = $1 AND patient_id = $2 RETURNING condition_id',
      [req.params.id, patientId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Condition not found.' });
    res.json({ deleted: true });
  } catch (err) {
    if (err.code === '22P02')
      return res.status(404).json({ error: 'Condition not found.' });
    console.error('Delete condition error:', err);
    res.status(500).json({ error: 'Could not delete condition.' });
  }
});

// ---------------------------------------------------------------
// Medical visits
// ---------------------------------------------------------------
// facility_name is stored as plain text (it is a plain VARCHAR in the schema);
// reason, diagnosis, treatment and notes are encrypted. visit_date is returned as text.
const VISIT_COLUMNS = `visit_id, facility_name, visit_date::text AS visit_date,
  reason_enc, diagnosis_enc, treatment_enc, notes_enc, created_at, updated_at`;
const VISIT_DUP_MSG =
  'A visit with the same date, facility and reason is already in your records. Edit the existing entry instead.';

function toVisit(row) {
  return {
    visit_id: row.visit_id,
    facility_name: row.facility_name,
    visit_date: row.visit_date,
    reason: decrypt(row.reason_enc),
    diagnosis: decrypt(row.diagnosis_enc),
    treatment: decrypt(row.treatment_enc),
    notes: decrypt(row.notes_enc),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function validateVisit(body) {
  const text = (v) => (typeof v === 'string' ? v.trim() : '');
  const facility = text(body.facilityName);
  const date = text(body.visitDate);
  const reason = text(body.reason);
  const diagnosis = text(body.diagnosis);
  const treatment = text(body.treatment);
  const notes = text(body.notes);

  if (!date) return { error: 'Visit date is required.' };
  if (!isRealDate(date))
    return { error: 'Visit date must be a real date in YYYY-MM-DD format.' };
  if (date > new Date().toISOString().slice(0, 10))
    return { error: 'Visit date cannot be in the future.' };
  if (date < '1900-01-01')
    return { error: 'Visit date is too far in the past.' };
  if (!facility && !reason)
    return { error: 'Add the facility or the reason for the visit.' };
  if (facility.length > 200)
    return { error: 'Facility name is too long (max 200 characters).' };
  if (reason.length > 1000)
    return { error: 'Reason is too long (max 1000 characters).' };
  if (diagnosis.length > 1000)
    return { error: 'Diagnosis is too long (max 1000 characters).' };
  if (treatment.length > 2000)
    return { error: 'Treatment is too long (max 2000 characters).' };
  if (notes.length > 2000)
    return { error: 'Notes are too long (max 2000 characters).' };

  return {
    value: {
      facility: facility || null,
      date,
      reason: reason || null,
      diagnosis: diagnosis || null,
      treatment: treatment || null,
      notes: notes || null,
    },
  };
}

// Same date + facility + reason (ignoring case and spacing) counts as the same visit.
// Two different visits on one day are still fine: they differ in facility or reason.
async function isDuplicateVisit(client, patientId, value, excludeId) {
  const result = await client.query(
    `SELECT visit_id, facility_name, reason_enc FROM medical_visits
     WHERE patient_id = $1 AND visit_date = $2`,
    [patientId, value.date],
  );
  const key = (facility, reason) =>
    `${normalizeName(facility || '')}|${normalizeName(reason || '')}`;
  const target = key(value.facility, value.reason);
  const skip = excludeId ? String(excludeId).toLowerCase() : null;
  return result.rows.some(
    (r) =>
      String(r.visit_id).toLowerCase() !== skip &&
      key(r.facility_name, decrypt(r.reason_enc)) === target,
  );
}

router.get('/visits', async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.userId);
    if (!patientId)
      return res.status(404).json({ error: 'Patient profile not found.' });

    const result = await pool.query(
      `SELECT ${VISIT_COLUMNS} FROM medical_visits
       WHERE patient_id = $1 ORDER BY visit_date DESC, created_at DESC`,
      [patientId],
    );
    res.json({ visits: result.rows.map(toVisit) });
  } catch (err) {
    console.error('List visits error:', err);
    res.status(500).json({ error: 'Could not load visits.' });
  }
});

router.post('/visits', async (req, res) => {
  const { error, value } = validateVisit(req.body || {});
  if (error) return res.status(400).json({ error });

  try {
    const patientId = await getPatientId(req.user.userId);
    if (!patientId)
      return res.status(404).json({ error: 'Patient profile not found.' });

    const outcome = await withPatientLock(patientId, async (client) => {
      if (await isDuplicateVisit(client, patientId, value, null))
        return { duplicate: true };
      const result = await client.query(
        `INSERT INTO medical_visits
           (patient_id, facility_name, visit_date, reason_enc, diagnosis_enc, treatment_enc, notes_enc)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${VISIT_COLUMNS}`,
        [
          patientId,
          value.facility,
          value.date,
          encrypt(value.reason),
          encrypt(value.diagnosis),
          encrypt(value.treatment),
          encrypt(value.notes),
        ],
      );
      return { row: result.rows[0] };
    });

    if (outcome.duplicate)
      return res.status(409).json({ error: VISIT_DUP_MSG });
    res.status(201).json({ visit: toVisit(outcome.row) });
  } catch (err) {
    console.error('Create visit error:', err);
    res.status(500).json({ error: 'Could not save visit.' });
  }
});

router.put('/visits/:id', async (req, res) => {
  const { error, value } = validateVisit(req.body || {});
  if (error) return res.status(400).json({ error });

  try {
    const patientId = await getPatientId(req.user.userId);
    if (!patientId)
      return res.status(404).json({ error: 'Patient profile not found.' });

    const outcome = await withPatientLock(patientId, async (client) => {
      if (await isDuplicateVisit(client, patientId, value, req.params.id))
        return { duplicate: true };
      const result = await client.query(
        `UPDATE medical_visits
         SET facility_name = $1, visit_date = $2, reason_enc = $3, diagnosis_enc = $4,
             treatment_enc = $5, notes_enc = $6
         WHERE visit_id = $7 AND patient_id = $8
         RETURNING ${VISIT_COLUMNS}`,
        [
          value.facility,
          value.date,
          encrypt(value.reason),
          encrypt(value.diagnosis),
          encrypt(value.treatment),
          encrypt(value.notes),
          req.params.id,
          patientId,
        ],
      );
      return { row: result.rows[0] };
    });

    if (outcome.duplicate)
      return res.status(409).json({ error: VISIT_DUP_MSG });
    if (!outcome.row)
      return res.status(404).json({ error: 'Visit not found.' });
    res.json({ visit: toVisit(outcome.row) });
  } catch (err) {
    if (err.code === '22P02')
      return res.status(404).json({ error: 'Visit not found.' });
    console.error('Update visit error:', err);
    res.status(500).json({ error: 'Could not update visit.' });
  }
});

router.delete('/visits/:id', async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.userId);
    if (!patientId)
      return res.status(404).json({ error: 'Patient profile not found.' });

    const result = await pool.query(
      'DELETE FROM medical_visits WHERE visit_id = $1 AND patient_id = $2 RETURNING visit_id',
      [req.params.id, patientId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Visit not found.' });
    res.json({ deleted: true });
  } catch (err) {
    if (err.code === '22P02')
      return res.status(404).json({ error: 'Visit not found.' });
    console.error('Delete visit error:', err);
    res.status(500).json({ error: 'Could not delete visit.' });
  }
});

// ---------------------------------------------------------------
// Dashboard summary: one query for every record count.
// Add a line here whenever a new record type is built.
// ---------------------------------------------------------------
router.get('/summary', async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.userId);
    if (!patientId)
      return res.status(404).json({ error: 'Patient profile not found.' });

    const result = await pool.query(
      `SELECT
        (SELECT count(*)::int FROM allergies WHERE patient_id = $1) AS allergies,
        (SELECT count(*)::int FROM medical_conditions WHERE patient_id = $1) AS conditions,
        (SELECT count(*)::int FROM medical_visits WHERE patient_id = $1) AS visits`,
      [patientId],
    );
    res.json({ summary: result.rows[0] });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Could not load summary.' });
  }
});

module.exports = router;
