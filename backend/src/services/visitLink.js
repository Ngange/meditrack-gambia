const AppError = require('../utils/AppError');

// A record may only be linked to one of the same patient's own visits. Without this check someone
// could attach their record to another patient's visit just by knowing its id.
// `db` is a pool or a transaction client.
async function assertVisitOwned(db, patientId, visitId) {
  if (!visitId) return;
  const result = await db.query('SELECT 1 FROM medical_visits WHERE visit_id = $1 AND patient_id = $2', [visitId, patientId]);
  if (result.rows.length === 0) throw new AppError(404, 'Visit not found.');
}

module.exports = { assertVisitOwned };
