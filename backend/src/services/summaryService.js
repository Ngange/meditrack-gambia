const pool = require('../config/db');
const models = require('../models');

// One query for every record count, built from the list of models.
// A new record type shows up here automatically.
async function getSummary(patientId) {
  const counts = models
    .map(
      (m) =>
        `(SELECT count(*)::int FROM ${m.table} WHERE patient_id = $1) AS ${m.plural}`,
    )
    .join(',\n       ');
  const result = await pool.query(`SELECT ${counts}`, [patientId]);
  return result.rows[0];
}

module.exports = { getSummary };
