const { clean } = require('../utils/text');
const { parseVisitId } = require('../utils/ids');
const { isRealDate, today } = require('../utils/dates');

const STATUSES = ['active', 'resolved', 'chronic'];

function validateCondition(body) {
  const name = clean(body.conditionName);
  const notes = clean(body.notes);
  const date = clean(body.diagnosisDate);
  const visit = parseVisitId(body.visitId);
  if (visit.error) return { error: visit.error };
  if (!name) return { error: 'Condition name is required.' };
  if (name.length > 200)
    return { error: 'Condition name is too long (max 200 characters).' };
  if (notes.length > 2000)
    return { error: 'Notes are too long (max 2000 characters).' };
  if (date) {
    if (!isRealDate(date))
      return {
        error: 'Diagnosis date must be a real date in YYYY-MM-DD format.',
      };
    if (date > today()) {
      return { error: 'Diagnosis date cannot be in the future.' };
    }
  }
  if (body.status && !STATUSES.includes(body.status)) {
    return { error: 'Status must be active, resolved or chronic.' };
  }
  return {
    value: {
      name,
      date: date || null,
      status: body.status || 'active',
      notes: notes || null,
      visitId: visit.value,
    },
  };
}

module.exports = { validateCondition };
