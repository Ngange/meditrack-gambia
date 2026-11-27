const express = require('express');
const validate = require('../middleware/validate');
const {
  validateRegister,
  validateLogin,
  validateDeviceRefresh,
  validateChangePassword,
} = require('../validators/authValidator');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { validateRegisterProvider } = require('../validators/providerValidator');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', validate(validateRegister), authController.register);
router.post('/register-provider', validate(validateRegisterProvider), authController.registerProvider);
router.post('/login', validate(validateLogin), authController.login);

router.post(
  '/change-password',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, onlyFailures: true }),
  requireAuth,
  validate(validateChangePassword),
  authController.changePassword,
);

// A phone trades its device key for a login token (no password). Wrong keys are counted per IP.
router.post(
  '/device-refresh',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, onlyFailures: true }),
  validate(validateDeviceRefresh),
  authController.deviceRefresh,
);

module.exports = router;
