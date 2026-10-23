// An error we raise on purpose, carrying the HTTP status and the message the client should see.
// Anything that is not an AppError is treated as unexpected and becomes a generic 500.
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = AppError;
