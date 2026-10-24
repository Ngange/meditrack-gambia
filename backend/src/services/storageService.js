const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');

// Where document bytes live. Everything above this file only calls save / read / remove with an
// opaque key, so moving to S3 or another object store later means rewriting just this file.
// This version keeps files on the server's disk in env.uploadDir, outside the web root.
// The caller encrypts before save() and decrypts after read(): this layer never sees plaintext.

const KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Keys are always generated here, but they also come back from the database,
// so they are checked before touching the filesystem (no path tricks).
function pathFor(key) {
  if (!KEY_PATTERN.test(key)) throw new Error('Invalid storage key.');
  return path.join(env.uploadDir, `${key}.bin`);
}

async function save(buffer) {
  await fs.mkdir(env.uploadDir, { recursive: true });
  const key = crypto.randomUUID();
  await fs.writeFile(pathFor(key), buffer, { flag: 'wx', mode: 0o600 });
  return key;
}

const read = (key) => fs.readFile(pathFor(key));

// Removing a file that is already gone is not an error.
async function remove(key) {
  await fs.rm(pathFor(key), { force: true });
}

module.exports = { save, read, remove };
