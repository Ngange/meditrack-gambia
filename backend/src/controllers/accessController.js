const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/pinService');
const history = require('../services/accessHistoryService');

// The patient's side of doctor access: see the code, set or change the PIN.
module.exports = {
  get: asyncHandler('Could not load your access details.', async (req, res) => {
    res.json({ access: await service.getAccess(req.patientId) });
  }),

  setPin: asyncHandler('Could not save the PIN.', async (req, res) => {
    res.json({ access: await service.setPin(req.user.userId, req.patientId, req.valid) });
  }),

  history: asyncHandler('Could not load your access history.', async (req, res) => {
    res.json(await history.get(req.patientId));
  }),

  endSession: asyncHandler('Could not end that access.', async (req, res) => {
    await history.endOne(req.patientId, req.params.sid, { userId: req.user.userId, ip: req.ip });
    res.status(204).end();
  }),

  endAll: asyncHandler('Could not end the access.', async (req, res) => {
    const ended = await history.endAll(req.patientId, { userId: req.user.userId, ip: req.ip });
    res.json({ ended });
  }),
};
