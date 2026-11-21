require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET', 'MEDITRACK_MASTER_KEY'];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    console.error('Copy .env.example to .env and fill in real values.');
    process.exit(1);
  }
}

const path = require('path');

module.exports = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  masterKey: process.env.MEDITRACK_MASTER_KEY,
  // Where encrypted document files are kept (outside the database). Never serve this folder.
  // Where the web app lives. Share links are built from it: <PUBLIC_WEB_URL>/s/<token>.
  publicWebUrl: (process.env.PUBLIC_WEB_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  // Set TRUST_PROXY=1 behind a reverse proxy so the audit log records the visitor's real IP, not the proxy's.
  trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY : false,
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'storage'),
};
