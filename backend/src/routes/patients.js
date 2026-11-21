const express = require('express');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateProfile } = require('../validators/profileValidator');
const requirePatient = require('../middleware/requirePatient');
const rateLimit = require('../middleware/rateLimit');
const { validateSetPin } = require('../validators/pinValidator');
const accessController = require('../controllers/accessController');
const patientController = require('../controllers/patientController');

const router = express.Router();

// Every route in this file requires a valid token.
router.use(requireAuth);

router.get('/me', patientController.getMe);
router.put('/me', validate(validateProfile), patientController.updateMe);

// Doctor access: the patient's code and PIN. Changing the PIN needs the password, so wrong
// passwords are limited per IP (a stolen logged-in phone must not be able to guess it).
const pinLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, onlyFailures: true });
router.get('/me/access', requirePatient, accessController.get);
router.put('/me/pin', pinLimit, requirePatient, validate(validateSetPin), accessController.setPin);

// Who has seen the record, and ending doctor access early.
router.get('/me/access-history', requirePatient, accessController.history);
router.delete('/me/access-sessions', requirePatient, accessController.endAll);
router.delete('/me/access-sessions/:sid', requirePatient, accessController.endSession);

module.exports = router;
