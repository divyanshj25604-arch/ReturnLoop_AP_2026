const bcrypt = require('bcryptjs');

const Operator = require('../models/operator.model');
const ApiError = require('../utils/ApiError');
const parseId = require('../utils/parseId');
const { createValidator } = require('../utils/validator');
const { APP_ROLES } = require('../utils/constants');

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Passwords are checked on the raw value (spaces can be part of a password).
function checkPassword(body, v, { required }) {
  if (body.password === undefined) {
    if (required) v.errors.push({ field: 'password', message: 'password is required' });
    return;
  }
  if (typeof body.password !== 'string' || body.password.length < MIN_PASSWORD_LENGTH) {
    v.errors.push({
      field: 'password',
      message: `password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }
}

function handleDbError(err, next) {
  if (err.code === '23505') {
    const field = err.constraint === 'uq_operators_email' ? 'email' : 'employee_code';
    return next(ApiError.conflict(`An operator with this ${field} already exists`));
  }
  if (err.code === '23503') {
    return next(
      ApiError.badRequest('Validation failed', [
        { field: 'warehouse_id', message: 'No warehouse with this warehouse_id' },
      ])
    );
  }
  return next(err);
}

// GET /api/operators (ADMIN)
async function getAllOperators(req, res, next) {
  try {
    const query = req.query || {};
    const v = createValidator(query).oneOf('app_role', APP_ROLES);

    let warehouseId;
    if (query.warehouse_id !== undefined) {
      warehouseId = parseId(query.warehouse_id);
      if (warehouseId === null) {
        v.errors.push({ field: 'warehouse_id', message: 'warehouse_id must be a positive whole number' });
      }
    }

    let isActive;
    if (query.is_active !== undefined) {
      if (query.is_active === 'true') isActive = true;
      else if (query.is_active === 'false') isActive = false;
      else v.errors.push({ field: 'is_active', message: 'is_active must be true or false' });
    }

    const { app_role } = v.throwIfErrors('Invalid query parameters');
    const operators = await Operator.findAll({
      warehouse_id: warehouseId,
      app_role,
      is_active: isActive,
    });
    res.status(200).json({ success: true, data: operators });
  } catch (err) {
    next(err);
  }
}

// POST /api/operators (ADMIN)
async function createOperator(req, res, next) {
  try {
    const body = req.body || {};
    const v = createValidator(body)
      .string('employee_code', { required: true, max: 20 })
      .string('full_name', { required: true, max: 100 })
      .string('email', { required: true, max: 120 })
      .string('role', { required: true, max: 50 })
      .oneOf('app_role', APP_ROLES, { required: true })
      .number('warehouse_id', { required: true, integer: true, min: 1 });
    if (v.values.email && !EMAIL_PATTERN.test(v.values.email)) {
      v.errors.push({ field: 'email', message: 'email must be a valid email address' });
    }
    checkPassword(body, v, { required: true });
    const values = v.throwIfErrors();

    const operator = await Operator.create({
      ...values,
      email: values.email.toLowerCase(),
      password_hash: await bcrypt.hash(body.password, BCRYPT_ROUNDS),
    });
    res.status(201).json({ success: true, message: 'Operator created', data: operator });
  } catch (err) {
    handleDbError(err, next);
  }
}

// PATCH /api/operators/:id (ADMIN)
async function updateOperator(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      throw ApiError.badRequest('Invalid operator ID');
    }

    const body = req.body || {};
    const v = createValidator(body)
      .string('full_name', { max: 100 })
      .string('role', { max: 50 })
      .oneOf('app_role', APP_ROLES)
      .number('warehouse_id', { integer: true, min: 1 })
      .boolean('is_active');
    checkPassword(body, v, { required: false });
    const values = v.throwIfErrors();

    // An admin can't lock themselves out.
    if (id === req.user.operator_id) {
      if (values.is_active === false) {
        throw ApiError.conflict('You cannot deactivate your own account');
      }
      if (values.app_role !== undefined && values.app_role !== 'ADMIN') {
        throw ApiError.conflict('You cannot remove your own ADMIN role');
      }
    }

    if (body.password !== undefined) {
      values.password_hash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
    }

    const operator = await Operator.update(id, values);
    if (!operator) {
      throw ApiError.notFound(`Operator with ID ${id} not found`);
    }
    res.status(200).json({ success: true, message: 'Operator updated', data: operator });
  } catch (err) {
    handleDbError(err, next);
  }
}

module.exports = { getAllOperators, createOperator, updateOperator };
