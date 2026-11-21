const { validateVisit } = require('./visitValidator');
const { validateCondition } = require('./conditionValidator');
const { validateMedication } = require('./medicationValidator');
const { validateLabResult } = require('./labResultValidator');

const LIMITS = { conditions: 10, medications: 20, labResults: 30 };

const asObject = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});

// Checks a list of records that came with the visit. Dates and the facility they leave out are
// taken from the visit, because everything here happened at that visit. Errors name the item to fix.
function checkList(label, raw, max, validator, defaults) {
  if (raw === undefined || raw === null) return { values: [] };
  if (!Array.isArray(raw)) return { error: `${label}s must be a list.` };
  if (raw.length > max) return { error: `You can add at most ${max} ${label.toLowerCase()}s to one visit.` };
  const values = [];
  for (const [i, item] of raw.entries()) {
    const checked = validator({ ...defaults, ...asObject(item), visitId: undefined });
    if (checked.error) return { error: `${label} ${i + 1}: ${checked.error}` };
    values.push(checked.value);
  }
  return { values };
}

// One visit plus the diagnoses, prescriptions and tests that came out of it, saved together.
// (Documents are files, so they are uploaded afterwards with this visit's id.)
function validateVisitBundle(body) {
  const checkedVisit = validateVisit(asObject(body.visit));
  if (checkedVisit.error) return { error: checkedVisit.error };
  const visit = checkedVisit.value;

  const conditions = checkList('Diagnosis', body.conditions, LIMITS.conditions, validateCondition, { diagnosisDate: visit.date });
  if (conditions.error) return { error: conditions.error };
  const medications = checkList('Prescription', body.medications, LIMITS.medications, validateMedication, { startDate: visit.date });
  if (medications.error) return { error: medications.error };
  const labResults = checkList('Test', body.labResults, LIMITS.labResults, validateLabResult, {
    testDate: visit.date,
    facilityName: visit.facility || '',
  });
  if (labResults.error) return { error: labResults.error };

  return {
    value: { visit, conditions: conditions.values, medications: medications.values, labResults: labResults.values },
  };
}

module.exports = { validateVisitBundle, LIMITS };
