const { encrypt, decrypt } = require('../services/encryption');
const { normalize } = require('../utils/text');

// test_name, result and reference_range are encrypted. facility_name is plain text (a plain
// VARCHAR in the schema, like visits). test_date is returned as text.
module.exports = {
  name: 'lab_result',
  plural: 'lab_results',
  label: 'Lab result',
  table: 'laboratory_results',
  idCol: 'result_id',
  selectColumns: `result_id, test_name_enc, test_date::text AS test_date, result_enc,
  reference_range_enc, facility_name, created_at, updated_at`,
  orderBy: 'test_date DESC, created_at DESC',

  fields: {
    test_name_enc: (v) => encrypt(v.testName),
    test_date: (v) => v.testDate,
    result_enc: (v) => encrypt(v.result),
    reference_range_enc: (v) => encrypt(v.referenceRange),
    facility_name: (v) => v.facility,
  },

  // The same test (ignoring case and spacing) on the same day is the same result.
  // Repeating a test on another day is normal and allowed.
  duplicate: {
    columns: 'test_name_enc',
    where: 'AND test_date = $2',
    params: (v) => [v.testDate],
    keyOfRow: (r) => normalize(decrypt(r.test_name_enc)),
    keyOfValue: (v) => normalize(v.testName),
    message: 'This test on the same date is already in your records. Edit the existing entry instead.',
  },

  toDto(row) {
    return {
      result_id: row.result_id,
      test_name: decrypt(row.test_name_enc),
      test_date: row.test_date,
      result: decrypt(row.result_enc),
      reference_range: decrypt(row.reference_range_enc),
      facility_name: row.facility_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },
};
