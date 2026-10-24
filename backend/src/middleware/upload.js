const multer = require('multer');
const { MAX_FILE_BYTES } = require('../utils/files');

// Accepts a single file in the "file" field and keeps it in memory (10 MB at most), so it can
// be checked and encrypted before anything is written to disk. Text fields arrive in req.body.
module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 5 },
}).single('file');
