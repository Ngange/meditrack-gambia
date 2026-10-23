import { DATE_HINT, isRealDate, todayLocal } from '@/utils/dates';
import type { Validation } from '@/utils/validation';

import type { LabPanelInput } from './types';

export type PanelRowValues = { id: number; testName: string; result: string; referenceRange: string };

export type PanelValues = { testDate: string; facility: string; rows: PanelRowValues[] };

export type PanelErrors = {
  testDate?: string;
  /** Problems keyed by row id. */
  rows: Record<number, string>;
  form?: string;
};

export const MAX_PANEL_ROWS = 30;

const isBlank = (r: PanelRowValues) => !r.testName.trim() && !r.result.trim() && !r.referenceRange.trim();

/** Rows left completely empty are ignored, so a spare row never blocks saving. */
export function validatePanel(v: PanelValues): Validation<LabPanelInput, PanelErrors> {
  const errors: PanelErrors = { rows: {} };
  const date = v.testDate.trim();

  if (!isRealDate(date)) errors.testDate = `${DATE_HINT}, e.g. 2026-03-02.`;
  else if (date > todayLocal()) errors.testDate = 'The test date cannot be in the future.';

  const filled = v.rows.filter((r) => !isBlank(r));
  const seen = new Set<string>();
  for (const r of filled) {
    const name = r.testName.trim();
    if (!name) errors.rows[r.id] = 'Enter the test name.';
    else if (seen.has(name.toLowerCase().replace(/\s+/g, ' '))) errors.rows[r.id] = 'This test is listed twice.';
    seen.add(name.toLowerCase().replace(/\s+/g, ' '));
  }
  if (filled.length === 0) errors.form = 'Add at least one test.';

  if (errors.testDate || errors.form || Object.keys(errors.rows).length > 0) return { input: null, errors };
  return {
    input: {
      testDate: date,
      facilityName: v.facility.trim(),
      results: filled.map((r) => ({
        testName: r.testName.trim(),
        result: r.result.trim(),
        referenceRange: r.referenceRange.trim(),
      })),
    },
    errors,
  };
}
