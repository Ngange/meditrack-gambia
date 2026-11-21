const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/visitBundleService');

module.exports = {
  create: asyncHandler('Could not save the visit.', async (req, res) => {
    res.status(201).json(await service.createWithRecords(req.patientId, req.valid));
  }),

  linked: asyncHandler('Could not load what came from this visit.', async (req, res) => {
    res.json(await service.getLinked(req.patientId, req.params.id));
  }),
};
