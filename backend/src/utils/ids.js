const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The optional visit a record came from. Empty means "no visit". Returns { value } or { error }.
function parseVisitId(raw) {
  if (raw === undefined || raw === null || raw === '') return { value: null };
  if (typeof raw !== 'string' || !UUID.test(raw.trim())) return { error: 'Visit is not valid.' };
  return { value: raw.trim().toLowerCase() };
}

module.exports = { parseVisitId };
