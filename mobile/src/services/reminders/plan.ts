import type { Medication } from '@/features/medications/types';
import { addDays, localDateString } from '@/utils/dates';
import { parseTime } from '@/utils/times';

/** How many days ahead dated reminders are scheduled. Refreshed whenever the app is opened. */
export const WINDOW_DAYS = 14;
/** iOS keeps at most 64 pending notifications per app. */
export const MAX_SCHEDULED = 60;

export type PlannedReminder = {
  id: string;
  medicationId: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
  /** Set for a one-off reminder on a specific day. Absent means "every day". */
  at?: Date;
};

type PlanOptions = {
  /** Put the medicine's name on the notification. Turn off to keep it off the lock screen. */
  showName?: boolean;
};

function content(m: Medication, showName: boolean) {
  if (!showName) return { title: 'MediTrack', body: 'Time to take your medicine.' };
  return {
    title: 'Time for your medicine',
    body: m.dosage ? `${m.medication_name} · ${m.dosage}` : m.medication_name,
  };
}

/**
 * Works out which notifications should exist right now.
 *
 * - An active medication with no end date that has already started rings every day (a repeating
 *   daily notification, so it keeps working even if the app is not opened for weeks).
 * - A course with an end date, or one that starts later, gets one-off notifications for the
 *   days it is actually running, up to WINDOW_DAYS ahead. That is what makes reminders stop on
 *   the end date and start on the start date.
 * - Completed or discontinued medications never ring.
 */
export function planReminders(medications: Medication[], now = new Date(), { showName = true }: PlanOptions = {}) {
  const today = localDateString(now);
  const windowEnd = addDays(today, WINDOW_DAYS - 1);
  const daily: PlannedReminder[] = [];
  const dated: PlannedReminder[] = [];

  for (const m of medications) {
    if (m.status !== 'active' || !m.reminder_times?.length) continue;
    if (m.end_date && m.end_date < today) continue;

    const { title, body } = content(m, showName);

    for (const time of m.reminder_times) {
      const { hour, minute } = parseTime(time);

      if (!m.end_date && m.start_date <= today) {
        daily.push({ id: `med|${m.medication_id}|${time}`, medicationId: m.medication_id, title, body, hour, minute });
        continue;
      }

      const first = m.start_date > today ? m.start_date : today;
      const last = m.end_date && m.end_date < windowEnd ? m.end_date : windowEnd;
      for (let day = first; day <= last; day = addDays(day, 1)) {
        const [y, mo, d] = day.split('-').map(Number);
        const at = new Date(y, mo - 1, d, hour, minute);
        if (at <= now) continue; // already passed today
        dated.push({ id: `med|${m.medication_id}|${day}|${time}`, medicationId: m.medication_id, title, body, hour, minute, at });
      }
    }
  }

  dated.sort((a, b) => a.at!.getTime() - b.at!.getTime());
  return [...daily, ...dated].slice(0, MAX_SCHEDULED);
}
