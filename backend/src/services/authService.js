const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const env = require('../config/env');
const AppError = require('../utils/AppError');

function signToken(user) {
  return jwt.sign({ userId: user.user_id, role: user.role }, env.jwtSecret, {
    expiresIn: '7d',
  });
}

// Creates the account and its empty patient profile in one transaction.
async function registerPatient({ email, password, firstName, lastName }) {
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

async function login({ email, password }) {
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

  return {
    token: signToken(user),
    user: { userId: user.user_id, email: user.email, role: user.role },
  };
}

module.exports = { registerPatient, registerProvider, login };
