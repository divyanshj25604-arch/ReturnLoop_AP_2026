const env = require('../config/env');

// Express recognises error handlers by their four-argument signature.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isServerError = status >= 500;

  if (isServerError) {
    console.error(err);
  }

  const body = {
    success: false,
    message:
      isServerError && env.nodeEnv === 'production'
        ? 'Internal server error'
        : err.message || 'Internal server error',
  };

  // Field-level validation errors (see src/utils/validator.js).
  if (!isServerError && Array.isArray(err.errors) && err.errors.length > 0) {
    body.errors = err.errors;
  }

  res.status(status).json(body);
}

module.exports = errorHandler;
