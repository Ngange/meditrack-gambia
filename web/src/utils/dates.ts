const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Dates travel as plain "YYYY-MM-DD" text, so no timezone can shift them by a day.

export const today = () => new Date().toISOString().slice(0, 10);

// True only for a real calendar date written as YYYY-MM-DD (rejects 1998-02-30, 1998-2-3, ...).
export function isRealDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// "1998-07-21" -> "21 Jul 1998" (by hand, so it never depends on locale or timezone)
export function formatDate(s: string) {
  const [y, m, d] = s.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}
