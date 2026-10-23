-- Reminder times for medications: "HH:MM" on a 24-hour clock, in the patient's own timezone.
-- The phone schedules the notifications itself, so the server only stores the times.
-- Safe to run more than once.
ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS reminder_times TEXT[] NOT NULL DEFAULT '{}'
  CHECK (cardinality(reminder_times) <= 6);
