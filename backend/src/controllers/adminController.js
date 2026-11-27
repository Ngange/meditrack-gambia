const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/providerService');
const admin = require('../services/adminService');

const STATUSES = ['pending', 'verified', 'rejected'];

module.exports = {
  listProviders: asyncHandler('Could not load the doctors.', async (req, res) => {
    const status = req.query.status === 'all' ? null : req.query.status || 'pending';
    if (status && !STATUSES.includes(status)) throw new AppError(400, 'Status must be pending, verified, rejected or all.');
    res.json({ providers: await service.listForAdmin(status) });
  }),

  decisions: asyncHandler('Could not load the decisions.', async (req, res) => {
    res.json({ decisions: await service.decisions() });
  }),

  overview: asyncHandler('Could not load the overview.', async (req, res) => res.json(await admin.overview())),
  users: asyncHandler('Could not load the users.', async (req, res) => res.json(await admin.users(req.query))),
  user: asyncHandler('Could not load this user.', async (req, res) => res.json(await admin.userDetail(req.params.id))),
  setUserStatus: asyncHandler('Could not change the account.', async (req, res) => {
    res.json(await admin.setStatus(req.user.userId, req.params.id, req.valid.status, req.valid.note));
  }),
  revokeDevices: asyncHandler('Could not sign the phones out.', async (req, res) => {
    res.json(await admin.revokeDevices(req.user.userId, req.params.id, req.valid.note));
  }),
  activity: asyncHandler('Could not load the activity.', async (req, res) => res.json(await admin.activity(req.query))),
  security: asyncHandler('Could not load the security flags.', async (req, res) => res.json(await admin.security())),
  doctorActivity: asyncHandler('Could not load doctor activity.', async (req, res) => res.json({ activity: await admin.doctorActivity() })),

  admins: asyncHandler('Could not load the administrators.', async (req, res) => res.json({ admins: await admin.admins() })),
  createAdmin: asyncHandler('Could not create the administrator.', async (req, res) => {
    res.status(201).json({ admin: await admin.createAdmin(req.user.userId, req.valid) });
  }),
  deleteUser: asyncHandler('Could not delete the account.', async (req, res) => {
    res.json(await admin.deleteUser(req.user.userId, req.params.id, req.valid));
  }),

  reviewProvider: asyncHandler('Could not save the decision.', async (req, res) => {
    res.json({ provider: await service.review(req.user.userId, req.params.id, req.valid) });
  }),
};
