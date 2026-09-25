require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET', 'MEDITRACK_MASTER_KEY'];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    console.error('Copy .env.example to .env and fill in real values.');
    process.exit(1);
  }
}

module.exports = {
  port: process.env.PORT || 4000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  masterKey: process.env.MEDITRACK_MASTER_KEY,
};
