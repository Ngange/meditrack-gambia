const asyncHandler = require('../utils/asyncHandler');
const syncService = require('../services/syncService');
const deviceService = require('../services/deviceService');

module.exports = {
  sync: asyncHandler('Could not sync. Please try again.', async (req, res) => {
    res.json(await syncService.sync({ userId: req.user.userId, patientId: req.patientId, ...req.valid }));
  }),

  devices: asyncHandler('Could not load your devices.', async (req, res) => {
    res.json({ devices: await deviceService.list(req.patientId) });
  }),

  revoke: asyncHandler('Could not sign that device out.', async (req, res) => {
    await deviceService.revoke(req.patientId, req.params.id);
    res.status(204).end();
  }),

  revokeAll: asyncHandler('Could not sign the devices out.', async (req, res) => {
    res.json({ revoked: await deviceService.revokeAll(req.patientId) });
  }),
};
