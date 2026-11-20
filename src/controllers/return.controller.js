const Return = require('../models/return.model');
const ApiError = require('../utils/ApiError');
const parseId = require('../utils/parseId');
const { createValidator } = require('../utils/validator');
const { RETURN_STATUSES } = require('../utils/constants');
const {
  scopeWarehouseFilter,
  loadReturnForUser,
  assertCanCreateInWarehouse,
} = require('../services/returnAccess.service');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Query-string numbers arrive as text. Returns the integer, undefined when
// the param is absent, or records a field error when it's not a positive integer.
function readPositiveIntParam(query, field, errors) {
  if (query[field] === undefined || query[field] === '') {
    return undefined;
  }
  const value = parseId(query[field]);
  if (value === null) {
    errors.push({ field, message: `${field} must be a positive whole number` });
  }
  return value;
}

function generateTrackingNumber() {
  return `RET-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// GET /api/returns
async function getAllReturns(req, res, next) {
  try {
    const query = req.query || {};
    const v = createValidator(query);
    v.oneOf('status', RETURN_STATUSES);
    v.string('q', { max: 100 });

    const warehouseId = readPositiveIntParam(query, 'warehouse_id', v.errors);
    const page = readPositiveIntParam(query, 'page', v.errors) || 1;
    const limit = readPositiveIntParam(query, 'limit', v.errors) || DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) {
      v.errors.push({ field: 'limit', message: `limit must be at most ${MAX_LIMIT}` });
    }
    const { status, q } = v.throwIfErrors('Invalid query parameters');

    const { rows, total } = await Return.findPage({
      status,
      q,
      warehouse_id: scopeWarehouseFilter(req.user, warehouseId),
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      data: rows,
      meta: { page, limit, total },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/returns/:id
async function getReturnById(req, res, next) {
  try {
    const returnId = parseId(req.params.id);
    if (returnId === null) {
      throw ApiError.badRequest('Invalid return ID');
    }

    const returnItem = await loadReturnForUser(returnId, req.user);
    const detail = await Return.findDetail(returnItem);

    res.status(200).json({ success: true, data: detail });
  } catch (err) {
    next(err);
  }
}

// POST /api/returns
async function createReturn(req, res, next) {
  try {
    const body = req.body || {};
    const v = createValidator(body);
    v.number('product_id', { integer: true, min: 1 });
    v.string('sku', { max: 50 });
    v.number('warehouse_id', { integer: true, min: 1 });
    v.string('warehouse_code', { max: 20 });
    v.string('return_reason', { required: true, max: 255 });
    v.string('serial_number', { max: 100 });
    v.date('return_date', { notFuture: true });
    v.string('customer_comment', { max: 2000 });
    v.string('return_tracking_number', { max: 50 });

    if (body.status !== undefined) {
      v.errors.push({
        field: 'status',
        message: 'status cannot be set; new returns always start as RECEIVED',
      });
    }
    if (body.product_id === undefined && body.sku === undefined) {
      v.errors.push({ field: 'product_id', message: 'product_id or sku is required' });
    }
    const values = v.throwIfErrors();

    // Resolve sku / warehouse_code to IDs. Unknown values are an error, not ignored.
    let productId = values.product_id;
    if (!productId && values.sku) {
      productId = await Return.findProductIdBySku(values.sku);
      if (!productId) {
        throw ApiError.badRequest('Validation failed', [
          { field: 'sku', message: `No product with SKU ${values.sku}` },
        ]);
      }
    }

    let warehouseId = values.warehouse_id;
    if (!warehouseId && values.warehouse_code) {
      warehouseId = await Return.findWarehouseIdByCode(values.warehouse_code);
      if (!warehouseId) {
        throw ApiError.badRequest('Validation failed', [
          {
            field: 'warehouse_code',
            message: `No warehouse with code ${values.warehouse_code}`,
          },
        ]);
      }
    }

    // No warehouse given: use the logged-in operator's own warehouse.
    if (!warehouseId) {
      warehouseId = req.user.warehouse_id;
    }
    assertCanCreateInWarehouse(req.user, warehouseId);

    const newReturn = await Return.create({
      return_tracking_number: values.return_tracking_number || generateTrackingNumber(),
      product_id: productId,
      warehouse_id: warehouseId,
      serial_number: values.serial_number,
      return_reason: values.return_reason,
      return_date: values.return_date,
      customer_comment: values.customer_comment,
    });

    res.status(201).json({
      success: true,
      message: 'Return created successfully',
      data: newReturn,
    });
  } catch (err) {
    if (err.code === '23505') {
      return next(ApiError.conflict('Return tracking number already exists'));
    }
    if (err.code === '23503') {
      return next(
        ApiError.badRequest('Validation failed', [
          {
            field: err.constraint === 'fk_returns_warehouse' ? 'warehouse_id' : 'product_id',
            message:
              err.constraint === 'fk_returns_warehouse'
                ? 'No warehouse with this warehouse_id'
                : 'No product with this product_id',
          },
        ])
      );
    }
    next(err);
  }
}

module.exports = {
  getAllReturns,
  getReturnById,
  createReturn,
};
