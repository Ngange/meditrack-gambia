const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const deviceService = require('./deviceService');

function signToken(user) {
  return jwt.sign({ userId: user.user_id, role: user.role }, env.jwtSecret, {
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

async function login({ email, password, device }) {
  const result = await pool.query(
    'SELECT user_id, email, password_hash, role, status FROM users WHERE email = $1',
    [email],
  );
  const invalid = new AppError(401, 'Invalid email or password.');

  if (result.rows.length === 0) throw invalid;
  const user = result.rows[0];

  if (!(await argon2.verify(user.password_hash, password))) throw invalid;
  // Checked after the password, so only the account's owner learns it is suspended.
  if (user.status !== 'active') throw new AppError(403, 'This account has been suspended. Contact support.');

  // A phone that signed in with its details gets a device key for offline sync (patients only).
  let issued = null;
  if (device && user.role === 'patient') {
    const profile = await pool.query('SELECT patient_id FROM patient_profile WHERE user_id = $1', [user.user_id]);
    if (profile.rows[0]) issued = await deviceService.issue(profile.rows[0].patient_id, device);
  }
  return {
    token: signToken(user),
    user: { userId: user.user_id, email: user.email, role: user.role },
    ...(issued ? { device: issued } : {}),
  };
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

module.exports = { registerPatient, registerProvider, login, refreshDevice };
