const env = require('../config/env');

function getHealth(req, res) {
  res.status(200).json({
    success: true,
    message: 'Return Loop API is running',
    service: 'Return Loop',
    environment: env.nodeEnv,
  });
}

module.exports = { getHealth };
