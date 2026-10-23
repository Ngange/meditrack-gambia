const { encrypt, decrypt } = require('../services/encryption');
const { normalize } = require('../utils/text');

module.exports = {
  name: 'medication',
  plural: 'medications',
  label: 'Medication',
  table: 'medications',
  idCol: 'medication_id',
  selectColumns: `medication_id, medication_name_enc, dosage_enc, frequency_enc,
  start_date::text AS start_date, end_date::text AS end_date, status, reminder_times, created_at, updated_at`,
  // Active medications first, then newest.
  orderBy: "(status = 'active') DESC, start_date DESC, created_at DESC",

  fields: {
    medication_name_enc: (v) => encrypt(v.name),
    dosage_enc: (v) => encrypt(v.dosage),
    frequency_enc: (v) => encrypt(v.frequency),
    start_date: (v) => v.start,
    end_date: (v) => v.end,
    status: (v) => v.status,
    reminder_times: (v) => v.reminderTimes,
  },

  // Same name (ignoring case and spacing) with the same start date is the same medication.
  // Taking the same medicine again in a later course (different start date) is allowed.
  duplicate: {
    columns: 'medication_name_enc',
    where: 'AND start_date = $2',
    params: (v) => [v.start],
    keyOfRow: (r) => normalize(decrypt(r.medication_name_enc)),
    keyOfValue: (v) => normalize(v.name),
    message:
      'This medication with the same start date is already in your records. Edit the existing entry instead.',
  },

  toDto(row) {
    return {
      medication_id: row.medication_id,
      medication_name: decrypt(row.medication_name_enc),
      dosage: decrypt(row.dosage_enc),
      frequency: decrypt(row.frequency_enc),
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
      reminder_times: row.reminder_times ?? [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },
};
