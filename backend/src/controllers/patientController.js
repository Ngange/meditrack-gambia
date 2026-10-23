const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const profileService = require('../services/profileService');

const getMe = asyncHandler('Could not load profile.', async (req, res) => {
  const profile = await profileService.getProfile(req.user.userId);
  if (!profile) throw new AppError(404, 'Patient profile not found.');
  res.json({ profile });
});

const updateMe = asyncHandler('Could not update profile.', async (req, res) => {
  const profile = await profileService.updateProfile(req.user.userId, req.valid);
  if (!profile) throw new AppError(404, 'Patient profile not found.');
  res.json({ profile });
});

module.exports = { getMe, updateMe };
