const { clean } = require('../utils/text');
const { isRealDate, EARLIEST_DATE } = require('../utils/dates');

const STATUSES = ['active', 'completed', 'discontinued'];
const MAX_REMINDERS = 6;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// Reminder times are "HH:MM" on a 24-hour clock, in the phone's own timezone.
// Returns sorted, de-duplicated times, or an error message.
function parseReminderTimes(raw) {
  if (raw === undefined || raw === null) return { times: [] };
  if (!Array.isArray(raw)) return { error: 'Reminder times must be a list of times.' };
  const times = [...new Set(raw.map((t) => (typeof t === 'string' ? t.trim() : t)))];
  if (times.some((t) => typeof t !== 'string' || !TIME_PATTERN.test(t))) {
    return { error: 'Each reminder time must be in HH:MM format, for example 08:00.' };
  }
  if (times.length > MAX_REMINDERS) {
    return { error: `You can set at most ${MAX_REMINDERS} reminder times per medication.` };
  }
  return { times: times.sort() };
}

function validateMedication(body) {
  const name = clean(body.medicationName);
  const dosage = clean(body.dosage);
  const frequency = clean(body.frequency);
  const start = clean(body.startDate);
  const end = clean(body.endDate);

  if (!name) return { error: 'Medication name is required.' };
  if (name.length > 200)
    return { error: 'Medication name is too long (max 200 characters).' };
  if (dosage.length > 200)
    return { error: 'Dosage is too long (max 200 characters).' };
  if (frequency.length > 200)
    return { error: 'Frequency is too long (max 200 characters).' };
  if (!start) return { error: 'Start date is required.' };
  if (!isRealDate(start))
    return { error: 'Start date must be a real date in YYYY-MM-DD format.' };
  if (start < EARLIEST_DATE)
    return { error: 'Start date is too far in the past.' };
  if (end) {
    if (!isRealDate(end))
      return { error: 'End date must be a real date in YYYY-MM-DD format.' };
    if (end < start)
      return { error: 'End date cannot be before the start date.' };
  }
  if (body.status && !STATUSES.includes(body.status)) {
    return { error: 'Status must be active, completed or discontinued.' };
  }
  const reminders = parseReminderTimes(body.reminderTimes);
  if (reminders.error) return { error: reminders.error };

  return {
    value: {
      name,
      dosage: dosage || null,
      frequency: frequency || null,
      start,
      end: end || null,
      status: body.status || 'active',
      reminderTimes: reminders.times,
    },
  };
}

module.exports = { validateMedication };
