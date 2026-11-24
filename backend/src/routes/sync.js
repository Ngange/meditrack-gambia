const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const requirePatient = require('../middleware/requirePatient');
const validate = require('../middleware/validate');
const rateLimit = require('../middleware/rateLimit');
const { validateSync } = require('../validators/syncValidator');
const controller = require('../controllers/syncController');

const router = express.Router();

// Offline sync is for patients, and the patient is always taken from the token.
router.use(requireAuth, requireRole('patient'), requirePatient);

// One call: the phone's waiting changes go up, everything it is missing comes back.
router.post('/', rateLimit({ windowMs: 60 * 1000, max: 120 }), validate(validateSync), controller.sync);

// The phones signed in to this account, and signing them out ("sign out everywhere").
router.get('/devices', controller.devices);
router.delete('/devices', controller.revokeAll);
router.delete('/devices/:id', controller.revoke);

module.exports = router;
