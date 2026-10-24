const { decrypt } = require('../services/encryption');

// A document is a file kept outside the database. This table holds only its details:
// the type, the shown file name, the date on the document, a description (encrypted) and an encrypted storage key.
// It is not served by the generic record service because it has file work to do,
// but it is listed in models/index.js so the dashboard count includes it.
module.exports = {
  name: 'document',
  plural: 'documents',
  label: 'Document',
  table: 'medical_documents',
  idCol: 'document_id',
  selectColumns: `document_id, document_type, file_name, file_path_enc, description_enc, document_date::text AS document_date, upload_date, created_at`,
  // Newest first by the date on the document itself (falling back to the day it was uploaded).
  orderBy: 'COALESCE(document_date, upload_date::date) DESC, upload_date DESC',

  // file_path_enc (the storage key) is deliberately not part of what clients see.
  toDto(row) {
    return {
      document_id: row.document_id,
      document_type: row.document_type,
      file_name: row.file_name,
      description: decrypt(row.description_enc),
      document_date: row.document_date,
      upload_date: row.upload_date,
    };
  },
};
