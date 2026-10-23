const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');

const register = asyncHandler(
  'Registration failed. Please try again.',
  async (req, res) => {
    res.status(201).json(await authService.registerPatient(req.valid));
  },
);

const login = asyncHandler('Login failed. Please try again.', async (req, res) => {
  res.json(await authService.login(req.valid));
});

module.exports = { register, login };
