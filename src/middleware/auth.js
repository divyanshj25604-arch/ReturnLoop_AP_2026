const Operator = require('../models/operator.model');
const ApiError = require('../utils/ApiError');
const { APP_ROLES } = require('../utils/constants');
const { verifyToken, getBearerToken } = require('../utils/token');

const INVALID_TOKEN = 'Missing, invalid or expired token';

// Verifies the Bearer token and loads the operator from the database.
// req.user comes from the database, not the token, so a role or warehouse
// change (or deactivation) applies on the very next request.
async function requireAuth(req, res, next) {
  try {
    const payload = verifyToken(getBearerToken(req));
    if (!payload) {
      throw ApiError.unauthorized(INVALID_TOKEN);
    }

    const operator = await Operator.findById(payload.sub);
    if (!operator || !operator.is_active) {
      throw ApiError.unauthorized(INVALID_TOKEN);
    }

    req.user = {
      operator_id: operator.operator_id,
      employee_code: operator.employee_code,
      full_name: operator.full_name,
      email: operator.email,
      app_role: operator.app_role,
      warehouse_id: operator.warehouse_id,
    };
    next();
  } catch (err) {
    next(err);
  }
}

// True when `role` is at least `minRole` (INSPECTOR < SUPERVISOR < ADMIN).
function hasRole(role, minRole) {
  const have = APP_ROLES.indexOf(role);
  const need = APP_ROLES.indexOf(minRole);
  return have !== -1 && have >= need;
}

// Use after requireAuth. Returns 403 when the user's role is too low.
function requireRole(minRole) {
  if (!APP_ROLES.includes(minRole)) {
    throw new Error(`requireRole: unknown role "${minRole}"`);
  }
  return function checkRole(req, res, next) {
    if (!req.user) {
      return next(ApiError.unauthorized(INVALID_TOKEN));
    }
    if (!hasRole(req.user.app_role, minRole)) {
      return next(ApiError.forbidden(`This action requires the ${minRole} role or higher`));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, hasRole };
