const crypto = require('crypto');

// A short code the patient can read out loud, like MTG-4829-1730. It is a lookup name, not a secret.
function generatePatientCode() {
  const part = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');
  return `MTG-${part()}-${part()}`;
}

// Doctors type it by hand, so accept lower case, spaces and a missing "MTG-" prefix.
function normalisePatientCode(input) {
  const digits = String(input || '').replace(/\D/g, '');
  return digits.length === 8 ? `MTG-${digits.slice(0, 4)}-${digits.slice(4)}` : null;
}

module.exports = { generatePatientCode, normalisePatientCode };
