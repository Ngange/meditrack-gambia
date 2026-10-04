const express = require('express');
const argon2 = require('argon2');
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({
      error: 'Email, password, first name, and last name are required.',
    });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 8 characters.' });
  }

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

    const token = jwt.sign(
      { userId: user.user_id, role: user.role },
      env.jwtSecret,
      { expiresIn: '7d' },
    );

    res.status(201).json({
      token,
      user: { userId: user.user_id, email: user.email, role: user.role },
      patient_id: profileResult.rows[0].patient_id,
    });
  } catch (err) {
    await client.query('ROLLBACK');

    if (err.code === '23505') {
      return res
        .status(409)
        .json({ error: 'An account with this email already exists.' });
    }

    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT user_id, email, password_hash, role, status FROM users WHERE email = $1',
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    const passwordValid = await argon2.verify(user.password_hash, password);

    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user.user_id, role: user.role },
      env.jwtSecret,
      { expiresIn: '7d' },
    );

    res.json({
      token,
      user: { userId: user.user_id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

module.exports = router;
