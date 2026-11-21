const pool = require('../config/db');
const AppError = require('../utils/AppError');
const createRecordService = require('./recordService');
const { withPatientLock } = require('./patientService');
const models = {
  visit: require('../models/visit'),
  condition: require('../models/condition'),
  medication: require('../models/medication'),
  labResult: require('../models/labResult'),
  document: require('../models/document'),
};

const visits = createRecordService(models.visit);
const conditions = createRecordService(models.condition);
const medications = createRecordService(models.medication);
const labResults = createRecordService(models.labResult);

// A duplicate inside the bundle says which item it was ("Diagnosis 2: ...").
async function insertAll(client, patientId, service, label, values, visitId) {
  const saved = [];
  for (const [i, value] of values.entries()) {
    try {
      saved.push(await service.insertIn(client, patientId, { ...value, visitId }));
    } catch (err) {
      if (err instanceof AppError && err.status === 409) throw new AppError(409, `${label} ${i + 1}: ${err.message}`);
      throw err;
    }
  }
  return saved;
}

// Saves a visit and everything that came out of it in one transaction: all of it, or none.
async function createWithRecords(patientId, bundle) {
  return withPatientLock(patientId, async (client) => {
    const visit = await visits.insertIn(client, patientId, bundle.visit);
    return {
      visit,
      conditions: await insertAll(client, patientId, conditions, 'Diagnosis', bundle.conditions, visit.visit_id),
      medications: await insertAll(client, patientId, medications, 'Prescription', bundle.medications, visit.visit_id),
      lab_results: await insertAll(client, patientId, labResults, 'Test', bundle.labResults, visit.visit_id),
    };
  });
}

// Everything linked to one visit, so the visit can show what came out of it.
async function getLinked(patientId, visitId) {
  const found = await pool.query('SELECT 1 FROM medical_visits WHERE visit_id = $1 AND patient_id = $2', [visitId, patientId]).catch((err) => {
    if (err.code === '22P02') return { rows: [] };
    throw err;
  });
  if (found.rows.length === 0) throw new AppError(404, 'Visit not found.');

  const load = async (model) => {
    const result = await pool.query(
      `SELECT ${model.selectColumns} FROM ${model.table} WHERE patient_id = $1 AND visit_id = $2 ORDER BY ${model.orderBy}`,
      [patientId, visitId],
    );
    return result.rows.map(model.toDto);
  };
  return {
    conditions: await load(models.condition),
    medications: await load(models.medication),
    lab_results: await load(models.labResult),
    documents: await load(models.document),
  };
}

module.exports = { createWithRecords, getLinked };
