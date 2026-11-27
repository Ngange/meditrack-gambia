const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const rateLimit = require('../middleware/rateLimit');
const { validateReview, validateUserStatus, validateNote, validateNewAdmin, validateDeleteUser } = require('../validators/providerValidator');
const adminController = require('../controllers/adminController');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/providers', adminController.listProviders);
router.get('/decisions', adminController.decisions);
router.get('/providers-activity', adminController.doctorActivity);
router.get('/overview', adminController.overview);
router.get('/users', adminController.users);
router.get('/users/:id', adminController.user);
router.patch('/users/:id/status', validate(validateUserStatus), adminController.setUserStatus);
router.post('/users/:id/revoke-devices', validate(validateNote), adminController.revokeDevices);
router.get('/admins', adminController.admins);
router.post('/admins', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, onlyFailures: true }), validate(validateNewAdmin), adminController.createAdmin);
router.delete('/users/:id', validate(validateDeleteUser), adminController.deleteUser);
router.get('/activity', adminController.activity);
router.get('/security', adminController.security);
router.patch('/providers/:id', validate(validateReview), adminController.reviewProvider);

module.exports = router;
