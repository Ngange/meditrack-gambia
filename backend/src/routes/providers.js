const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const providerController = require('../controllers/providerController');

const router = express.Router();
router.use(requireAuth, requireRole('provider'));

router.get('/me', providerController.getMe);

module.exports = router;
