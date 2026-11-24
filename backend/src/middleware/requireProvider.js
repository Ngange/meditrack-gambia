const pool = require('../config/db');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Looks up the logged-in doctor's provider_id once and puts it on req.providerId.
const requireProvider = asyncHandler('Could not load your doctor profile.', async (req, res, next) => {
  const { rows } = await pool.query('SELECT provider_id FROM provider_profile WHERE user_id = $1', [req.user.userId]);
  if (!rows[0]) throw new AppError(404, 'Doctor profile not found.');
  req.providerId = rows[0].provider_id;
  next();
});

module.exports = requireProvider;
