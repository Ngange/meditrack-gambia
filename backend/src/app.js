const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const pool = require('./config/db');

const app = express();

app.use(cors());
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
// app.use("/shares", require("./routes/shares"));
// app.use("/timeline", require("./routes/timeline"));
// app.use("/admin", require("./routes/admin"));

app.listen(env.port, () => {
  console.log(`MediTrack API listening on port ${env.port}`);
});
