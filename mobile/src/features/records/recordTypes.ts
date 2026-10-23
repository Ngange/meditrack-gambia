import type { Summary } from '@/api';

/**
 * The record types the app knows about. The Home tiles and the Health records screen are both
 * built from this list, so a new type only needs an entry here (plus its feature folder and route).
 */
export const RECORD_TYPES = [
  { key: 'allergies', label: 'Allergies', title: 'Allergies', hint: 'Allergens and reactions', href: '/allergies' },
  {
    key: 'conditions',
    label: 'Conditions',
    title: 'Medical conditions',
    hint: 'Diagnoses and ongoing conditions',
    href: '/conditions',
  },
  { key: 'visits', label: 'Visits', title: 'Visits', hint: 'Clinic and hospital visits', href: '/visits' },
  {
    key: 'medications',
    label: 'Medications',
    title: 'Medications',
    hint: 'What you take, how much and how often',
    href: '/medications',
  },
  {
    key: 'lab_results',
    label: 'Lab results',
    title: 'Lab results',
    hint: 'Blood tests, scans and other results',
    href: '/lab-results',
  },
] as const satisfies readonly { key: keyof Summary; label: string; title: string; hint: string; href: string }[];
