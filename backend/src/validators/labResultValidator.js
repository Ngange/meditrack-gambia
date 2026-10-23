const { clean } = require('../utils/text');
const { isRealDate, today, EARLIEST_DATE } = require('../utils/dates');

function validateLabResult(body) {
  const testName = clean(body.testName);
  const testDate = clean(body.testDate);
  const result = clean(body.result);
  const referenceRange = clean(body.referenceRange);
  const facility = clean(body.facilityName);

  if (!testName) return { error: 'Test name is required.' };
  if (testName.length > 200) return { error: 'Test name is too long (max 200 characters).' };
  if (!testDate) return { error: 'Test date is required.' };
  if (!isRealDate(testDate)) return { error: 'Test date must be a real date in YYYY-MM-DD format.' };
  if (testDate > today()) return { error: 'Test date cannot be in the future.' };
  if (testDate < EARLIEST_DATE) return { error: 'Test date is too far in the past.' };
  if (result.length > 1000) return { error: 'Result is too long (max 1000 characters).' };
  if (referenceRange.length > 200) return { error: 'Reference range is too long (max 200 characters).' };
  if (facility.length > 200) return { error: 'Facility name is too long (max 200 characters).' };

  return {
    value: {
      testName,
      testDate,
      result: result || null,
      referenceRange: referenceRange || null,
      facility: facility || null,
    },
  };
}

const MAX_BATCH = 30;

// One lab visit often produces many results (a blood panel). The date and lab are shared;
// each row is a test with its own result and normal range. Every row goes through the same
// rules as a single result, and an error says which row to fix.
function validateLabBatch(body) {
  if (!Array.isArray(body.results) || body.results.length === 0) {
    return { error: 'Add at least one test result.' };
  }
  if (body.results.length > MAX_BATCH) {
    return { error: `You can add at most ${MAX_BATCH} results at a time.` };
  }
  const values = [];
  for (const [i, row] of body.results.entries()) {
    const checked = validateLabResult({
      testDate: body.testDate,
      facilityName: body.facilityName,
      ...(row && typeof row === 'object' ? row : {}),
    });
    if (checked.error) return { error: `Row ${i + 1}: ${checked.error}` };
    values.push(checked.value);
  }
  return { value: values };
}

module.exports = { validateLabResult, validateLabBatch };
