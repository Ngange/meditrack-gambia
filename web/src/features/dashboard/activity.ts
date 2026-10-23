import { capitalize } from '../../utils/text';
import { today } from '../../utils/dates';
import type { DashboardData } from './loadDashboard';

export type Activity = {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'Allergy' | 'Condition' | 'Visit' | 'Medication';
  title: string;
  detail: string;
  to: string;
};

// Merges every record type into one list, newest first.
export function buildActivity({ allergies, conditions, visits, medications }: DashboardData, limit = 6): Activity[] {
  const items: Activity[] = [
    ...allergies.map<Activity>((a) => ({
      id: a.allergy_id,
      date: a.created_at.slice(0, 10),
      type: 'Allergy',
      title: `Allergy: ${a.allergen}`,
      detail: [a.severity ? `${capitalize(a.severity)} severity` : '', a.reaction ?? '', capitalize(a.status)]
        .filter(Boolean)
        .join(' · '),
      to: '/allergies',
    })),
    ...conditions.map<Activity>((c) => ({
      id: c.condition_id,
      date: c.created_at.slice(0, 10),
      type: 'Condition',
      title: `Condition: ${c.condition_name}`,
      detail: [capitalize(c.status), c.diagnosis_date ? `Diagnosed ${c.diagnosis_date}` : '', c.notes ?? '']
        .filter(Boolean)
        .join(' · '),
      to: '/conditions',
    })),
    ...visits.map<Activity>((v) => ({
      id: v.visit_id,
      date: v.visit_date,
      type: 'Visit',
      title: `Visit: ${v.facility_name || v.reason || 'Clinic visit'}`,
      detail: [v.facility_name ? (v.reason ?? '') : '', v.diagnosis ?? '', v.treatment ?? ''].filter(Boolean).join(' · '),
      to: '/visits',
    })),
    ...medications.map<Activity>((m) => ({
      id: m.medication_id,
      date: m.start_date <= today() ? m.start_date : m.created_at.slice(0, 10),
      type: 'Medication',
      title: `Medication: ${m.medication_name}`,
      detail: [m.dosage ?? '', m.frequency ?? '', capitalize(m.status)].filter(Boolean).join(' · '),
      to: '/medications',
    })),
  ];

  return items.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0)).slice(0, limit);
}
