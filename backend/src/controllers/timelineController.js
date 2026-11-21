const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/timelineService');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// Reads ?limit= and ?offset= and keeps them sensible (whole numbers, within bounds).
const whole = (raw, fallback, min, max) => {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};

module.exports = {
  get: asyncHandler('Could not load your timeline.', async (req, res) => {
    const limit = whole(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = whole(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    res.json(await service.getTimeline(req.patientId, { limit, offset }));
  }),
};
