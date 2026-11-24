const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/providerSessionService');

// Runs before every doctor request about a patient. The patient is never named by the client:
// it comes from the session, and the session must belong to this doctor, still be running, and
// the doctor must still be verified. Sets req.patientId and req.session.
const requireSession = asyncHandler('Could not check your access.', async (req, res, next) => {
  await service.assertVerified(req.providerId);
  const session = await service.getActive(req.providerId, req.params.sid);
  req.session = session;
  req.patientId = session.patient_id;
  next();
});

module.exports = requireSession;
