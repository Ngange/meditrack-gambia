const AppError = require('../utils/AppError');

// The single place that turns errors into JSON responses.
// Express recognises this as error middleware because it takes four arguments.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // An error we raised on purpose: not found, duplicate, bad input, ...
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }

  // multer: an upload that is too big, or sent under the wrong field name.
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'That file is too large. The limit is 10 MB.' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: 'Upload one file at a time.' });
  }

  // Malformed JSON in the request body.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON.' });
  }

  // 23514 = a CHECK constraint rejected a value, 22001 = a value is longer than its column allows.
  if (err.code === '23514' || err.code === '22001') {
    return res.status(400).json({
      error: 'One of the values was not accepted. Please check your entries.',
    });
  }

  console.error(`${req.method} ${req.originalUrl} failed:`, err);
  res
    .status(500)
    .json({ error: err.publicMessage || 'Something went wrong. Please try again.' });
}

module.exports = errorHandler;
