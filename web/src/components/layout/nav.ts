import type { JSX } from 'react';
import {
  IconAllergy,
  IconClock,
  IconCondition,
  IconDashboard,
  IconFile,
  IconFlask,
  IconPill,
  IconShare,
  IconUser,
  IconVisit,
} from './icons';

export type NavItem = {
  to: string;
  label: string;
  icon: () => JSX.Element;
  end?: boolean;
  /** Not built yet: shown greyed out with a "Soon" tag. */
  soon?: boolean;
};

// The sidebar. To add a page, add a line here and a route in routes/AppRoutes.tsx.
export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: IconDashboard, end: true },
  { to: '/allergies', label: 'Allergies', icon: IconAllergy },
  { to: '/conditions', label: 'Conditions', icon: IconCondition },
  { to: '/visits', label: 'Visits', icon: IconVisit },
  { to: '/medications', label: 'Medications', icon: IconPill },
  { to: '/lab-results', label: 'Lab Results', icon: IconFlask },
  { to: '/documents', label: 'Documents', icon: IconFile },
  { to: '/timeline', label: 'Timeline', icon: IconClock, soon: true },
  { to: '/share', label: 'Share Records', icon: IconShare, soon: true },
  { to: '/profile', label: 'Profile', icon: IconUser },
];
