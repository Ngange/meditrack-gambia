const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const deviceService = require('./deviceService');
const { cleanIp } = require('./auditService');

function signToken(user) {
  return jwt.sign({ userId: user.user_id, role: user.role, ...(user.must_change_password ? { mcp: true } : {}) }, env.jwtSecret, {
    expiresIn: '7d',
  });
}

// Creates the account and its empty patient profile in one transaction.
async function registerPatient({ device, ...account }) {
  const created = await createPatientAccount(account);
  // After the registration's own connection is released, so two are never held at once.
  const issued = device ? await deviceService.issue(created.patient_id, device) : null;
  return issued ? { ...created, device: issued } : created;
}

async function createPatientAccount({ email, password, firstName, lastName }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = await argon2.hash(password);

    const userResult = await client.query(
      "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'patient') RETURNING user_id, email, role",
      [email, passwordHash],
    );
    const user = userResult.rows[0];

    const profileResult = await client.query(
      'INSERT INTO patient_profile (user_id, first_name, last_name) VALUES ($1, $2, $3) RETURNING patient_id',
      [user.user_id, firstName, lastName],
    );

    await client.query('COMMIT');

    return {
      token: signToken(user),
      user: { userId: user.user_id, email: user.email, role: user.role },
      patient_id: profileResult.rows[0].patient_id,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      throw new AppError(409, 'An account with this email already exists.');
    }
    throw err;
  } finally {
    client.release();
  }
}

// Creates a doctor's account and profile. They start as "pending" and cannot verify themselves.
async function registerProvider({ email, password, firstName, lastName, licenceNumber, facilityName, specialty }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = await argon2.hash(password);
    const userResult = await client.query(
      "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'provider') RETURNING user_id, email, role",
      [email, passwordHash],
    );
    const user = userResult.rows[0];
    const profile = await client.query(
      `INSERT INTO provider_profile (user_id, first_name, last_name, licence_number, facility_name, specialty)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING provider_id`,
      [user.user_id, firstName, lastName, licenceNumber, facilityName, specialty],
    );
    await client.query('COMMIT');
    return {
      token: signToken(user),
      user: { userId: user.user_id, email: user.email, role: user.role },
      provider_id: profile.rows[0].provider_id,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      if (String(err.constraint || err.message).includes('licence')) {
        throw new AppError(409, 'An account with this licence number already exists.');
      }
      throw new AppError(409, 'An account with this email already exists.');
    }
    throw err;
  } finally {
    client.release();
  }
}

// One line per login attempt, for the administrator's activity and security screens. It never breaks a login.
// meta = { ip, userAgent }. The phone app is told apart from a browser by its device details or its user agent.
async function recordLogin({ userId = null, email, success, reason }, meta = {}, device = null) {
  try {
    const source = device || /okhttp|expo|cfnetwork|react-native/i.test(meta.userAgent || '') ? 'app' : 'web';
    await pool.query(
      'INSERT INTO login_events (user_id, email, success, reason, source, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, String(email).toLowerCase().slice(0, 255), success, reason, source, cleanIp(meta.ip)],
    );
  } catch (err) {
    console.error('Could not record login:', err.message);
  }
}

async function login({ email, password, device }, meta = {}) {
  const result = await pool.query(
    'SELECT user_id, email, password_hash, role, status, must_change_password FROM users WHERE email = $1',
    [email],
  );
  const invalid = new AppError(401, 'Invalid email or password.');

  if (result.rows.length === 0) {
    await recordLogin({ email, success: false, reason: 'unknown_email' }, meta, device);
    throw invalid;
  }
  const user = result.rows[0];

  if (!(await argon2.verify(user.password_hash, password))) {
    await recordLogin({ userId: user.user_id, email, success: false, reason: 'bad_password' }, meta, device);
    throw invalid;
  }
  // Checked after the password, so only the account's owner learns it is suspended.
  if (user.status !== 'active') {
    await recordLogin({ userId: user.user_id, email, success: false, reason: 'suspended' }, meta, device);
    throw new AppError(403, 'This account has been suspended. Contact support.');
  }
  await recordLogin({ userId: user.user_id, email, success: true, reason: 'ok' }, meta, device);

  // A phone that signed in with its details gets a device key for offline sync (patients only).
  let issued = null;
  if (device && user.role === 'patient') {
    const profile = await pool.query('SELECT patient_id FROM patient_profile WHERE user_id = $1', [user.user_id]);
    if (profile.rows[0]) issued = await deviceService.issue(profile.rows[0].patient_id, device);
  }
  return {
    token: signToken(user),
    user: { userId: user.user_id, email: user.email, role: user.role, ...(user.must_change_password ? { mustChangePassword: true } : {}) },
    ...(issued ? { device: issued } : {}),
  };
}

// The signed-in person chooses a new password. Their phones are signed out (they sign in again with the new one).
async function changePassword(userId, { currentPassword, newPassword }) {
  const { rows } = await pool.query('SELECT user_id, role, password_hash FROM users WHERE user_id = $1', [userId]);
  const user = rows[0];
  if (!user || !(await argon2.verify(user.password_hash, currentPassword))) throw new AppError(400, 'Your current password is not right.');
  if (currentPassword === newPassword) throw new AppError(400, 'Choose a password different from the current one.');
  await pool.query('UPDATE users SET password_hash = $2, must_change_password = false WHERE user_id = $1', [userId, await argon2.hash(newPassword)]);
  await deviceService.revokeAllForUser(userId);
  return { token: signToken({ user_id: user.user_id, role: user.role }) };
}

// The phone trades its device key for a fresh login token without asking for the password.
async function refreshDevice({ deviceKey }) {
  const r = await deviceService.refresh(deviceKey);
  return {
    token: signToken({ user_id: r.user.user_id, role: r.user.role }),
    user: { userId: r.user.user_id, email: r.user.email, role: r.user.role },
    device: { device_id: r.device_id, device_key: r.device_key },
  };
}

module.exports = {
  changePassword, registerPatient, registerProvider, login, refreshDevice };
