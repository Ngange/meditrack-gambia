const { encrypt, decrypt } = require('../services/encryption');
const { normalize } = require('../utils/text');

// A model describes one record type: its table, how a request value becomes database
// columns (encrypting where needed), how a row becomes the JSON we send back, and what
// counts as a duplicate. The generic record service does all the work from this description.
module.exports = {
  name: 'allergy',
  plural: 'allergies',
  label: 'Allergy',
  table: 'allergies',
  idCol: 'allergy_id',
  selectColumns:
    'allergy_id, allergen_enc, reaction_enc, severity, status, created_at, updated_at',
  orderBy: 'created_at DESC',

  // column -> how to compute it from the validated value
  fields: {
    allergen_enc: (v) => encrypt(v.allergen),
    reaction_enc: (v) => encrypt(v.reaction),
    severity: (v) => v.severity,
    status: (v) => v.status,
  },

  // Encrypted names never repeat (fresh IV each time), so UNIQUE cannot catch duplicates.
  // We decrypt this patient's rows and compare these keys instead.
  duplicate: {
    columns: 'allergen_enc',
    where: '',
    params: () => [],
    keyOfRow: (r) => normalize(decrypt(r.allergen_enc)),
    keyOfValue: (v) => normalize(v.allergen),
    message:
      'This allergy is already in your records. Edit the existing entry instead.',
  },

  toDto(row) {
    return {
      allergy_id: row.allergy_id,
      allergen: decrypt(row.allergen_enc),
      reaction: decrypt(row.reaction_enc),
      severity: row.severity,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },
};
