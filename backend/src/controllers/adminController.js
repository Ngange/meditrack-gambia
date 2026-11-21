const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/providerService');

const STATUSES = ['pending', 'verified', 'rejected'];

module.exports = {
  listProviders: asyncHandler('Could not load the doctors.', async (req, res) => {
    const status = req.query.status === 'all' ? null : req.query.status || 'pending';
    if (status && !STATUSES.includes(status)) throw new AppError(400, 'Status must be pending, verified, rejected or all.');
    res.json({ providers: await service.listForAdmin(status) });
  }),

  reviewProvider: asyncHandler('Could not save the decision.', async (req, res) => {
    res.json({ provider: await service.review(req.user.userId, req.params.id, req.valid) });
  }),
};
