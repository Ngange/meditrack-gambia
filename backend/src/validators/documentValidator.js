const { clean } = require('../utils/text');
const { sanitizeFileName } = require('../utils/files');
const { isRealDate, today, EARLIEST_DATE } = require('../utils/dates');

const TYPES = ['prescription', 'lab_report', 'discharge_summary', 'medical_certificate', 'other'];

// Details that come with an upload (type, description) or an edit (those plus the shown name).
function validateDocumentDetails(body) {
  const documentType = clean(body.documentType) || 'other';
  const description = clean(body.description);
  const rawName = clean(body.fileName);
  const documentDate = clean(body.documentDate);

  if (!TYPES.includes(documentType)) {
    return { error: 'Document type must be prescription, lab report, discharge summary, medical certificate or other.' };
  }
  if (description.length > 1000) return { error: 'Description is too long (max 1000 characters).' };

  // The date the document was issued (optional): this is what places it on the timeline.
  if (documentDate) {
    if (!isRealDate(documentDate)) return { error: 'Document date must be a real date in YYYY-MM-DD format.' };
    if (documentDate > today()) return { error: 'Document date cannot be in the future.' };
    if (documentDate < EARLIEST_DATE) return { error: 'Document date is too far in the past.' };
  }

  let fileName;
  if (rawName) {
    fileName = sanitizeFileName(rawName);
    if (!fileName) return { error: 'That file name is not valid.' };
  }

  return { value: { documentType, description: description || null, documentDate: documentDate || null, fileName } };
}

module.exports = { validateDocumentDetails, TYPES };
