import type { TimelineEvent } from './types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "May 2026" from "2026-05-14". */
export const monthLabel = (date: string) => `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;

export type Row = { type: 'month'; key: string; label: string } | { type: 'event'; key: string; event: TimelineEvent };

/** The events with a month heading inserted wherever the month changes. */
export function withMonths(events: TimelineEvent[]): Row[] {
  const rows: Row[] = [];
  let current = '';
  for (const event of events) {
    const label = monthLabel(event.date);
    if (label !== current) {
      current = label;
      rows.push({ type: 'month', key: `month:${label}`, label });
    }
    rows.push({ type: 'event', key: event.key, event });
  }
  return rows;
}
