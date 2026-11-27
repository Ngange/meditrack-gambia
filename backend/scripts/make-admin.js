// Creates an admin account (a separate login, not a patient account).
//   node scripts/make-admin.js you@example.com
// You are asked for the password; or set ADMIN_PASSWORD for a non-interactive run.
const readline = require('readline');
const argon2 = require('argon2');
const pool = require('../src/config/db');

async function ask(question) {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (a) => {
      rl.close();
      resolve(a);
    }),
  );
}

(async () => {
  const email = (process.argv[2] || '').trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    console.error('Usage: node scripts/make-admin.js admin@meditrack.test');
    process.exit(1);
  }
  const password = await ask('Choose an admin password (8+ characters): ');
  if (password.length < 8) {
    console.error('The password must be at least 8 characters.');
    process.exit(1);
  }
  try {
    await pool.query(
      "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin')",
      [email, await argon2.hash(password)],
    );
    console.log(
      `Admin account created for ${email}. Log in with it through POST /auth/login.`,
    );
  } catch (err) {
    console.error(
      err.code === '23505'
        ? 'An account with that email already exists. Use a different email.'
        : err.message,
    );
    process.exitCode = 1;
  } finally {
    await pool.end?.();
  }
})();
