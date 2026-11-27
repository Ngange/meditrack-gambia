const jwt = require('jsonwebtoken');
const env = require('../config/env');
const pool = require('../config/db');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Missing or malformed Authorization header.' });
  }

  const token = authHeader.slice('Bearer '.length);

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  // A login token lasts days, so suspension has to be checked on every request, not only at login.
  try {
    const { rows } = await pool.query('SELECT status FROM users WHERE user_id = $1', [decoded.userId]);
    // No row means the account was deleted.
    if (!rows[0]) return res.status(401).json({ error: 'This account no longer exists.' });
    if (rows[0].status !== 'active') {
      return res.status(401).json({ error: 'This account has been suspended. Contact support.' });
    }
  } catch (err) {
    return next(err);
  }
  // An account with a temporary password may do nothing but choose a new one.
  if (decoded.mcp && !(req.baseUrl + req.path).endsWith('/auth/change-password')) {
    return res.status(409).json({ error: 'Choose a new password first.', code: 'password_change_required' });
  }
  req.user = decoded;
  next();
}

function requireRole(role) {
  return function (req, res, next) {
    if (req.user.role !== role) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to access this resource.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
