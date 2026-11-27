const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');

const register = asyncHandler(
  'Registration failed. Please try again.',
  async (req, res) => {
    res.status(201).json(await authService.registerPatient(req.valid));
  },
);

const registerProvider = asyncHandler(
  'Registration failed. Please try again.',
  async (req, res) => {
    res.status(201).json(await authService.registerProvider(req.valid));
  },
);

const login = asyncHandler('Login failed. Please try again.', async (req, res) => {
  res.json(await authService.login(req.valid, { ip: req.ip, userAgent: req.get('user-agent') }));
});

const deviceRefresh = asyncHandler('Could not sync. Please try again.', async (req, res) => {
  res.json(await authService.refreshDevice(req.valid));
});

const changePassword = asyncHandler('Could not change the password.', async (req, res) => {
  res.json(await authService.changePassword(req.user.userId, req.valid));
});

module.exports = { changePassword, register, registerProvider, login, deviceRefresh };
