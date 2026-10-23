const { clean } = require('../utils/text');
const { isRealDate, today, EARLIEST_DATE } = require('../utils/dates');

function validateVisit(body) {
  const facility = clean(body.facilityName);
  const date = clean(body.visitDate);
  const reason = clean(body.reason);
  const diagnosis = clean(body.diagnosis);
  const treatment = clean(body.treatment);
  const notes = clean(body.notes);

  if (!date) return { error: 'Visit date is required.' };
  if (!isRealDate(date))
    return { error: 'Visit date must be a real date in YYYY-MM-DD format.' };
  if (date > today()) return { error: 'Visit date cannot be in the future.' };
  if (date < EARLIEST_DATE)
    return { error: 'Visit date is too far in the past.' };
  if (!facility && !reason)
    return { error: 'Add the facility or the reason for the visit.' };
  if (facility.length > 200)
    return { error: 'Facility name is too long (max 200 characters).' };
  if (reason.length > 1000)
    return { error: 'Reason is too long (max 1000 characters).' };
  if (diagnosis.length > 1000)
    return { error: 'Diagnosis is too long (max 1000 characters).' };
  if (treatment.length > 2000)
    return { error: 'Treatment is too long (max 2000 characters).' };
  if (notes.length > 2000)
    return { error: 'Notes are too long (max 2000 characters).' };

  return {
    value: {
      facility: facility || null,
      date,
      reason: reason || null,
      diagnosis: diagnosis || null,
      treatment: treatment || null,
      notes: notes || null,
    },
  };
}

module.exports = { validateVisit };
