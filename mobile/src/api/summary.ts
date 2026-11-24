import { activeStore } from '@/offline/active';
import { summary } from '@/offline/local';

export type Summary = {
  /** How many are currently active (shown as "1 active" on Home). */
  active: { allergies: number; conditions: number; medications: number };
  allergies: number;
  conditions: number;
  visits: number;
  medications: number;
  lab_results: number;
  documents: number;
};

/** Counts from the phone's saved copy. */
export const getSummary = async (): Promise<Summary> => summary(activeStore());
