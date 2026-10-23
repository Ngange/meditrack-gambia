const express = require('express');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateProfile } = require('../validators/profileValidator');
const patientController = require('../controllers/patientController');

const router = express.Router();

// Every route in this file requires a valid token.
router.use(requireAuth);

router.get('/me', patientController.getMe);
router.put('/me', validate(validateProfile), patientController.updateMe);

module.exports = router;
