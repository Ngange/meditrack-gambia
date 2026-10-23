const express = require('express');
const validate = require('../middleware/validate');
const {
  validateRegister,
  validateLogin,
} = require('../validators/authValidator');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', validate(validateRegister), authController.register);
router.post('/login', validate(validateLogin), authController.login);

module.exports = router;
