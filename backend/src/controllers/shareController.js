const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/shareService');

// The patient's side: make, list and revoke share links. req.patientId comes from requirePatient.
module.exports = {
  create: asyncHandler('Could not create the link.', async (req, res) => {
    // The token and url are in this response only: the server keeps just a hash of the token.
    res.status(201).json(await service.create(req.patientId, req.valid));
  }),

  list: asyncHandler('Could not load your links.', async (req, res) => {
    res.json({ shares: await service.list(req.patientId) });
  }),

  revoke: asyncHandler('Could not revoke the link.', async (req, res) => {
    await service.revoke(req.patientId, req.params.id);
    res.json({ revoked: true });
  }),
};
