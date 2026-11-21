const crypto = require('crypto');

// A share link carries a random secret. Only its SHA-256 hash is stored, so a copy of the
// database cannot be used to open anyone's link. 32 random bytes = 256 bits: not guessable.
const generateToken = () => crypto.randomBytes(32).toString('base64url');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// The shape generateToken produces (43 URL-safe characters). Anything else cannot be a real link.
const looksLikeToken = (token) => typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);

module.exports = { generateToken, hashToken, looksLikeToken };
