const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateReview } = require('../validators/providerValidator');
const adminController = require('../controllers/adminController');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/providers', adminController.listProviders);
router.patch('/providers/:id', validate(validateReview), adminController.reviewProvider);

module.exports = router;
