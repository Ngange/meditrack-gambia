const { encrypt, decrypt } = require('../services/encryption');
const { normalize } = require('../utils/text');

// facility_name is stored as plain text (a plain VARCHAR in the schema);
// reason, diagnosis, treatment and notes are encrypted. visit_date is returned as text.
const key = (facility, reason) =>
  `${normalize(facility || '')}|${normalize(reason || '')}`;

module.exports = {
  name: 'visit',
  plural: 'visits',
  label: 'Visit',
  table: 'medical_visits',
  idCol: 'visit_id',
  selectColumns: `visit_id, facility_name, visit_date::text AS visit_date,
  reason_enc, diagnosis_enc, treatment_enc, notes_enc, created_at, updated_at`,
  orderBy: 'visit_date DESC, created_at DESC',

  fields: {
    facility_name: (v) => v.facility,
    visit_date: (v) => v.date,
    reason_enc: (v) => encrypt(v.reason),
    diagnosis_enc: (v) => encrypt(v.diagnosis),
    treatment_enc: (v) => encrypt(v.treatment),
    notes_enc: (v) => encrypt(v.notes),
  },

  // Same date + facility + reason (ignoring case and spacing) is the same visit.
  // Two different visits on one day are fine: they differ in facility or reason.
  duplicate: {
    columns: 'facility_name, reason_enc',
    where: 'AND visit_date = $2',
    params: (v) => [v.date],
    keyOfRow: (r) => key(r.facility_name, decrypt(r.reason_enc)),
    keyOfValue: (v) => key(v.facility, v.reason),
    message:
      'A visit with the same date, facility and reason is already in your records. Edit the existing entry instead.',
  },

  toDto(row) {
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
  },
};
