const pool = require('../config/db');
const { buildTimeline } = require('../utils/timeline');
const models = {
  visit: require('../models/visit'),
  condition: require('../models/condition'),
  medication: require('../models/medication'),
  labResult: require('../models/labResult'),
  document: require('../models/document'),
};

const load = async (model, patientId) => {
  const result = await pool.query(`SELECT ${model.selectColumns} FROM ${model.table} WHERE patient_id = $1`, [patientId]);
  return result.rows.map(model.toDto);
};

// The patient's whole history as one dated list, a page at a time.
async function getTimeline(patientId, { limit, offset }) {
  const [visits, conditions, medications, labResults, documents] = await Promise.all([
    load(models.visit, patientId),
    load(models.condition, patientId),
    load(models.medication, patientId),
    load(models.labResult, patientId),
    load(models.document, patientId),
  ]);
  const all = buildTimeline({ visits, conditions, medications, labResults, documents });
  const page = all.slice(offset, offset + limit);
  return { timeline: page, total: all.length, hasMore: offset + page.length < all.length };
}

module.exports = { getTimeline };
