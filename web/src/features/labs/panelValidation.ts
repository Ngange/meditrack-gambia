import { today } from '../../utils/dates';
import type { LabPanelInput } from '../../types/records';

export type PanelRow = { id: number; testName: string; result: string; referenceRange: string };

export const MAX_PANEL_ROWS = 30;

const isBlank = (r: PanelRow) => !r.testName.trim() && !r.result.trim() && !r.referenceRange.trim();
const key = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

/** Returns the data to send, or a message. Rows left completely empty are ignored. */
export function validatePanel(values: { testDate: string; facility: string; rows: PanelRow[] }): { input?: LabPanelInput; error?: string } {
  if (!values.testDate) return { error: 'Test date is required.' };
  if (values.testDate > today()) return { error: 'The test date cannot be in the future.' };

  const filled = values.rows.filter((r) => !isBlank(r));
  if (filled.length === 0) return { error: 'Add at least one test.' };

  const seen = new Set<string>();
  for (const [i, r] of filled.entries()) {
    if (!r.testName.trim()) return { error: `Row ${i + 1}: enter the test name.` };
    if (seen.has(key(r.testName))) return { error: `Row ${i + 1}: "${r.testName.trim()}" is listed twice.` };
    seen.add(key(r.testName));
  }

  return {
    input: {
      testDate: values.testDate,
      facilityName: values.facility.trim(),
      results: filled.map((r) => ({
        testName: r.testName.trim(),
        result: r.result.trim(),
        referenceRange: r.referenceRange.trim(),
      })),
    },
  };
}
