const jwt = require('jsonwebtoken');
const env = require('../config/env');

const ALGORITHM = 'HS256';

function getSecret() {
  if (!env.jwt.secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return env.jwt.secret;
}

// Payload follows docs/api.md section 2: { sub, role, warehouse_id }.
function signToken(operator) {
  return jwt.sign(
    {
      sub: operator.operator_id,
      role: operator.app_role,
      warehouse_id: operator.warehouse_id,
    },
    getSecret(),
    { algorithm: ALGORITHM, expiresIn: env.jwt.expiresIn }
  );
}

// Returns the decoded payload, or null if the token is missing, invalid or expired.
function verifyToken(token) {
  if (!token) {
    return null;
  }
  try {
    return jwt.verify(token, getSecret(), { algorithms: [ALGORITHM] });
  } catch {
    return null;
  }
}

// Reads "Authorization: Bearer <token>". Returns the token or null.
function getBearerToken(req) {
  const header = req.headers.authorization;
  if (typeof header !== 'string') {
    return null;
  }
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

module.exports = { signToken, verifyToken, getBearerToken };
