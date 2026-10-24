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
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'storage'),
};
