export const MAX_REMINDERS = 6;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "20:00, 08:00" -> { times: ["08:00", "20:00"] }, or an error message for a bad entry. */
export function parseReminderTimes(text: string): { times: string[]; error?: string } {
  const parts = text
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const times = [...new Set(parts)].sort();
  if (times.some((t) => !TIME.test(t))) {
    return { times, error: 'Reminder times must look like 08:00 or 20:30 (24-hour clock), separated by commas.' };
  }
  if (times.length > MAX_REMINDERS) {
    return { times, error: `You can set at most ${MAX_REMINDERS} reminder times.` };
  }
  return { times };
}

export function validateMedication(values: { name: string; start: string; end: string; reminders: string }): string | null {
  if (!values.name.trim()) return 'Medication name is required.';
  if (!values.start) return 'Start date is required.';
  if (values.end && values.end < values.start) return 'The end date cannot be before the start date.';
  return parseReminderTimes(values.reminders).error ?? null;
}
