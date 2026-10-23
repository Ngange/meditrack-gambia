const AppError = require('./AppError');

// Wraps an async route handler so a thrown error reaches the error-handling middleware
// instead of becoming an unhandled rejection. failMessage is what the client sees if the
// error turns out to be unexpected (a database failure, a bug, ...).
function asyncHandler(failMessage, handler) {
  return (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch((err) => {
      if (!(err instanceof AppError)) err.publicMessage = failMessage;
      next(err);
    });
}

module.exports = asyncHandler;
