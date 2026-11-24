const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const pool = require('./config/db');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', env.trustProxy);
app.use(cors());
// Sync requests carry a batch of changes, so they may be larger than the default 100 KB.
app.use('/sync', express.json({ limit: '1mb' }));
app.use(express.json());

// Health check — confirms the server is up and can reach the database.
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res
      .status(500)
      .json({ status: 'error', database: 'unreachable', message: err.message });
  }
});

// Route modules are mounted here as they're built:
app.use('/auth', require('./routes/auth'));
app.use('/patients', require('./routes/patients'));
app.use('/records', require('./routes/records'));
app.use('/shares', require('./routes/shares')); // the patient manages their share links
app.use('/shared', require('./routes/shared')); // what the person holding a link sees (no login)
// app.use("/timeline", require("./routes/timeline"));
app.use('/providers', require('./routes/providers')); // a doctor's own profile and verification status
app.use('/provider', require('./routes/provider')); // a verified doctor opening a patient with code + PIN
app.use('/admin', require('./routes/admin')); // verifying doctors (admin only)
app.use('/sync', require('./routes/sync')); // offline sync for the phone, and its device keys

// Must come after all routes: unknown URLs, then every error thrown above.
app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`MediTrack API listening on port ${env.port}`);
});
