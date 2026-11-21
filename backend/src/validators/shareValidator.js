// What a share link may include, and how long it may last.
const SHAREABLE = ['allergies', 'conditions', 'visits', 'medications', 'lab_results', 'documents', 'emergency_contact'];

const DURATIONS = {
  '1h': 60 * 60,
  '24h': 24 * 60 * 60,
  '7d': 7 * 24 * 60 * 60,
};

// Name and blood group are always shown on a shared page, so they are not listed here.
function validateShare(body) {
  const types = body.recordTypes;
  if (!Array.isArray(types) || types.length === 0) {
    return { error: 'Choose at least one section to share.' };
  }
  if (!types.every((t) => SHAREABLE.includes(t))) {
    return { error: 'One of the sections you chose cannot be shared.' };
  }
  const seconds = DURATIONS[body.duration];
  if (!seconds) return { error: 'Choose how long the link should work: 1 hour, 24 hours or 7 days.' };

  return { value: { recordTypes: [...new Set(types)], seconds } };
}

module.exports = { validateShare, SHAREABLE, DURATIONS };
