export function validateVisit(values: { date: string; facility: string; reason: string }): string | null {
  if (!values.date) return 'Visit date is required.';
  if (!values.facility.trim() && !values.reason.trim()) return 'Add the facility or the reason for the visit.';
  return null;
}
