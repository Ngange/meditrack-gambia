const crypto = require('crypto');
const env = require('../config/env');

// AES-256-GCM field-level encryption.
// Stored format (one TEXT column): iv:authTag:ciphertext, each part base64.
// A fresh random IV is used for every call, so encrypting the same value twice
// gives different output. The auth tag makes tampering detectable.

const key = Buffer.from(env.masterKey, 'base64');
if (key.length !== 32) {
  throw new Error('MEDITRACK_MASTER_KEY must be a base64-encoded 32-byte key.');
}

function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((b) => b.toString('base64')).join(':');
}

function decrypt(packed) {
  if (packed === null || packed === undefined) return null;
  const [iv, tag, data] = packed
    .split(':')
    .map((p) => Buffer.from(p, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8',
  );
}

module.exports = { encrypt, decrypt };
