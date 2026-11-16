const env = require('../config/env');

// Express recognises error handlers by their four-argument signature.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isServerError = status >= 500;

  if (isServerError) {
    console.error(err);
  }

  res.status(status).json({
    success: false,
    message:
      isServerError && env.nodeEnv === 'production'
        ? 'Internal server error'
        : err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
