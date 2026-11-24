const MAX_CHANGES = 200;
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 300;

function validateSync(body) {
  const cursor = body.cursor === undefined || body.cursor === null ? 0 : body.cursor;
  if (!Number.isInteger(cursor) || cursor < 0) return { error: 'cursor must be a whole number from 0.' };
  const changes = body.changes === undefined ? [] : body.changes;
  if (!Array.isArray(changes)) return { error: 'changes must be a list.' };
  if (changes.length > MAX_CHANGES) return { error: `Send at most ${MAX_CHANGES} changes at a time.` };
  const limit = body.limit === undefined ? DEFAULT_LIMIT : body.limit;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) return { error: `limit must be from 1 to ${MAX_LIMIT}.` };
  if (typeof body.deviceId !== 'string' || !body.deviceId) return { error: 'Sign in again to sync.' };
  return { value: { deviceId: body.deviceId, cursor, changes, limit } };
}

module.exports = { validateSync };
