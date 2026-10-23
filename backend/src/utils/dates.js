// Dates travel as plain "YYYY-MM-DD" text end to end, so no timezone can shift them by a day.

function isRealDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const EARLIEST_DATE = '1900-01-01';

module.exports = { isRealDate, today, EARLIEST_DATE };
