const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// True only for a real calendar date written as YYYY-MM-DD (rejects 2026-02-30, 2026-2-3, ...).
export function isRealDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// A date in the phone's own timezone, as YYYY-MM-DD.
export function localDateString(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Today in the phone's own timezone, as YYYY-MM-DD.
export const todayLocal = () => localDateString(new Date());

// "2026-10-13" + 2 -> "2026-10-15" (calendar arithmetic, safe across month ends and daylight saving).
export function addDays(date: string, days: number) {
  const [y, m, d] = date.split('-').map(Number);
  return localDateString(new Date(y, m - 1, d + days));
}

// "1998-07-21" -> "21 Jul 1998" (done by hand so it never depends on device locale or timezone)
export function formatDate(s: string) {
  const [y, m, d] = s.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

export const DATE_HINT = 'Enter a real date in the format YYYY-MM-DD';
