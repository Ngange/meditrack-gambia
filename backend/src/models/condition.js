const { encrypt, decrypt } = require('../services/encryption');
const { normalize } = require('../utils/text');

module.exports = {
  name: 'condition',
  plural: 'conditions',
  label: 'Condition',
  table: 'medical_conditions',
  idCol: 'condition_id',
  // diagnosis_date is a plain SQL DATE. node-pg would turn it into a JS Date, which can
  // shift by a day across timezones, so we ask Postgres for text.
  selectColumns: `condition_id, condition_name_enc,
  diagnosis_date::text AS diagnosis_date, status, notes_enc, created_at, updated_at`,
  orderBy: 'diagnosis_date DESC NULLS LAST, created_at DESC',

  fields: {
    condition_name_enc: (v) => encrypt(v.name),
    diagnosis_date: (v) => v.date,
    status: (v) => v.status,
    notes_enc: (v) => encrypt(v.notes),
  },

  duplicate: {
    columns: 'condition_name_enc',
    where: '',
    params: () => [],
    keyOfRow: (r) => normalize(decrypt(r.condition_name_enc)),
    keyOfValue: (v) => normalize(v.name),
    message:
      'This condition is already in your records. Edit the existing entry instead.',
  },

  toDto(row) {
    return {
      condition_id: row.condition_id,
      condition_name: decrypt(row.condition_name_enc),
      diagnosis_date: row.diagnosis_date,
      status: row.status,
      notes: decrypt(row.notes_enc),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },
};
