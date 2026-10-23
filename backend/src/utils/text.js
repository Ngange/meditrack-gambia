// A trimmed string, or '' when the value is missing or not a string.
function clean(v) {
  return typeof v === 'string' ? v.trim() : '';
}

// Used to compare names: ignores case, spacing and unicode look-alike forms.
function normalize(s) {
  return String(s).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

module.exports = { clean, normalize };
