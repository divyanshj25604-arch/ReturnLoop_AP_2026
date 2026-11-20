const bcrypt = require('bcryptjs');

const Operator = require('../models/operator.model');
const ApiError = require('../utils/ApiError');
const { createValidator } = require('../utils/validator');
const { signToken, verifyToken, getBearerToken } = require('../utils/token');

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const INVALID_LOGIN = 'Invalid email or password';

// Compared against when the email doesn't exist, so a wrong email takes about
// as long as a wrong password and response time doesn't reveal valid accounts.
let dummyHash;
function getDummyHash() {
  if (!dummyHash) {
    dummyHash = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);
  }
  return dummyHash;
}

// The user object returned by login and /auth/me (docs/api.md section 5.2).
function toUser(operator) {
  return {
    operator_id: operator.operator_id,
    employee_code: operator.employee_code,
    full_name: operator.full_name,
    email: operator.email,
    app_role: operator.app_role,
    warehouse_id: operator.warehouse_id,
  };
}

// Temporary token check for /me and /password. Step 10 replaces this with the
// shared requireAuth middleware.
async function getCurrentOperator(req) {
  const payload = verifyToken(getBearerToken(req));
  if (!payload) {
    throw ApiError.unauthorized('Missing, invalid or expired token');
  }
  const operator = await Operator.findById(payload.sub);
  if (!operator || !operator.is_active) {
    throw ApiError.unauthorized('Missing, invalid or expired token');
  }
  return operator;
}

async function login(req, res, next) {
  try {
    const { email } = createValidator(req.body)
      .string('email', { required: true })
      .string('password', { required: true })
      .throwIfErrors();

    const operator = await Operator.findByEmailWithPassword(email);
    const passwordOk = await bcrypt.compare(
      req.body.password,
      operator ? operator.password_hash : getDummyHash()
    );

    if (!operator || !passwordOk || !operator.is_active) {
      throw ApiError.unauthorized(INVALID_LOGIN);
    }

    res.status(200).json({
      success: true,
      data: {
        token: signToken(operator),
        user: toUser(operator),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const operator = await getCurrentOperator(req);
    res.status(200).json({ success: true, data: toUser(operator) });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const current = await getCurrentOperator(req);

    const v = createValidator(req.body)
      .string('current_password', { required: true })
      .string('new_password', { required: true });
    if (
      typeof req.body?.new_password === 'string' &&
      req.body.new_password.length < MIN_PASSWORD_LENGTH
    ) {
      v.errors.push({
        field: 'new_password',
        message: `new_password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }
    v.throwIfErrors();

    const operator = await Operator.findByIdWithPassword(current.operator_id);
    const passwordOk = await bcrypt.compare(req.body.current_password, operator.password_hash);
    if (!passwordOk) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    // Use the raw value (not trimmed): spaces can be part of a password.
    const newHash = await bcrypt.hash(req.body.new_password, BCRYPT_ROUNDS);
    await Operator.updatePasswordHash(operator.operator_id, newHash);

    res.status(200).json({ success: true, message: 'Password updated' });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me, changePassword };
