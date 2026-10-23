const asyncHandler = require('../utils/asyncHandler');
const summaryService = require('../services/summaryService');

const getSummary = asyncHandler('Could not load summary.', async (req, res) => {
  res.json({ summary: await summaryService.getSummary(req.patientId) });
});

module.exports = { getSummary };
