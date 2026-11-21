const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const requirePatient = require('../middleware/requirePatient');
const validate = require('../middleware/validate');
const { validateShare } = require('../validators/shareValidator');
const shareController = require('../controllers/shareController');

const router = express.Router();

// Only a logged-in patient manages links, and only their own.
router.use(requireAuth, requireRole('patient'), requirePatient);

router.post('/', validate(validateShare), shareController.create);
router.get('/', shareController.list);
router.delete('/:id', shareController.revoke);

module.exports = router;
