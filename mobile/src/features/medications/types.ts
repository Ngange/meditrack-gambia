export const MEDICATION_STATUSES = ['active', 'completed', 'discontinued'] as const;

export type MedicationStatus = (typeof MEDICATION_STATUSES)[number];

export type Medication = {
  medication_id: string;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string | null;
  status: MedicationStatus;
  reminder_times: string[]; // "HH:MM", 24-hour, phone's timezone
  created_at: string;
  updated_at: string;
};

export type MedicationInput = {
  medicationName: string;
  dosage?: string;
  frequency?: string;
  startDate: string;
  endDate?: string;
  status?: MedicationStatus;
  reminderTimes?: string[];
};

export const MAX_REMINDERS = 6;
