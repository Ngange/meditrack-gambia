const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/providerService');

module.exports = {
  getMe: asyncHandler('Could not load your profile.', async (req, res) => {
    res.json({ provider: await service.getMe(req.user.userId) });
  }),
};
