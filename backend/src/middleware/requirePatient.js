const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getPatientId } = require('../services/patientService');

// Looks up the logged-in user's patient_id once and puts it on req.patientId.
// Controllers never take a patient id from the client.
const requirePatient = asyncHandler(
  'Could not load your patient profile.',
  async (req, res, next) => {
    const patientId = await getPatientId(req.user.userId);
    if (!patientId) throw new AppError(404, 'Patient profile not found.');
    req.patientId = patientId;
    next();
  },
);

module.exports = requirePatient;
