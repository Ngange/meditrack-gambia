const { clean } = require('../utils/text');

const SEVERITIES = ['mild', 'moderate', 'severe'];
const STATUSES = ['active', 'resolved'];

function validateAllergy(body) {
  const allergen = clean(body.allergen);
  const reaction = clean(body.reaction);
  if (!allergen) return { error: 'Allergen is required.' };
  if (allergen.length > 200)
    return { error: 'Allergen is too long (max 200 characters).' };
  if (reaction.length > 1000)
    return { error: 'Reaction is too long (max 1000 characters).' };
  if (body.severity && !SEVERITIES.includes(body.severity)) {
    return { error: 'Severity must be mild, moderate or severe.' };
  }
  if (body.status && !STATUSES.includes(body.status)) {
    return { error: 'Status must be active or resolved.' };
  }
  return {
    value: {
      allergen,
      reaction: reaction || null,
      severity: body.severity || null,
      status: body.status || 'active',
    },
  };
}

module.exports = { validateAllergy };
