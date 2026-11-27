// The phone may say who it is when signing in, so it can be given a device key for offline sync.
// Anything wrong with it is ignored rather than refusing the sign-in.
function cleanDevice(raw) {
  if (!raw || typeof raw !== 'object') return undefined;
  const text = (v, max) => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : undefined);
  return { name: text(raw.name, 150), platform: raw.platform === 'android' ? 'android' : undefined, deviceKey: text(raw.deviceKey, 200) };
}

function validateRegister(body) {
  const { email, password, firstName, lastName } = body;
  if (!email || !password || !firstName || !lastName) {
    return {
      error: 'Email, password, first name, and last name are required.',
    };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }
  return { value: { email, password, firstName, lastName, device: cleanDevice(body.device) } };
}

function validateLogin(body) {
  const { email, password } = body;
  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }
  return { value: { email, password, device: cleanDevice(body.device) } };
}

function validateDeviceRefresh(body) {
  if (typeof body.deviceKey !== 'string' || !body.deviceKey) return { error: 'Sign in again to sync.' };
  return { value: { deviceKey: body.deviceKey } };
}

function validateChangePassword(body) {
  const { currentPassword, newPassword } = body;
  if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' || !newPassword) {
    return { error: 'Enter your current password and a new one.' };
  }
  if (newPassword.length < 8) return { error: 'The new password must be at least 8 characters.' };
  if (newPassword.length > 200) return { error: 'The new password is too long.' };
  return { value: { currentPassword, newPassword } };
}

module.exports = { validateRegister, validateLogin, validateDeviceRefresh, validateChangePassword };
