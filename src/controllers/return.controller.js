const Return = require('../models/return.model');
const db = require('../config/db');
const parseId = require('../utils/parseId');
const {
  isRestrictedToOwnWarehouse,
  scopeWarehouseFilter,
  loadReturnForUser,
  assertCanCreateInWarehouse,
} = require('../services/returnAccess.service');

async function getAllReturns(req, res, next) {
  try {
    const returns = await Return.findAll({
      status: req.query.status,
      warehouse_id: scopeWarehouseFilter(req.user, parseId(req.query.warehouse_id)),
    });
    res.status(200).json({
      success: true,
      data: returns,
    });
  } catch (err) {
    next(err);
  }
}

async function getReturnById(req, res, next) {
  try {
    const returnId = parseInt(req.params.id, 10);
    if (Number.isNaN(returnId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid return ID',
      });
    }

    const returnItem = await loadReturnForUser(returnId, req.user);

    res.status(200).json({
      success: true,
      data: returnItem,
    });
  } catch (err) {
    next(err);
  }
}

async function createReturn(req, res, next) {
  try {
    let {
      return_tracking_number,
      product_id,
      sku,
      warehouse_id,
      warehouse_code,
      serial_number,
      return_reason,
      return_date,
      status,
      customer_comment,
    } = req.body;

    if (!product_id && sku) {
      const productRes = await db.query(
        'SELECT product_id FROM products WHERE sku = $1',
        [sku]
      );
      if (productRes.rows.length > 0) {
        product_id = productRes.rows[0].product_id;
      }
    }

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'product_id is required',
      });
    }

    if (!warehouse_id && warehouse_code) {
      const whRes = await db.query(
        'SELECT warehouse_id FROM warehouses WHERE warehouse_code = $1',
        [warehouse_code]
      );
      if (whRes.rows.length > 0) {
        warehouse_id = whRes.rows[0].warehouse_id;
      }
    }

    // Inspectors default to their own warehouse and may not use another one.
    const resolvedWarehouseId =
      warehouse_id || (isRestrictedToOwnWarehouse(req.user) ? req.user.warehouse_id : 1);
    assertCanCreateInWarehouse(req.user, Number(resolvedWarehouseId));

    if (!return_reason || typeof return_reason !== 'string' || !return_reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'return_reason is required',
      });
    }

    const validStatuses = [
      'RECEIVED',
      'UNDER_INSPECTION',
      'EVALUATED',
      'DECIDED',
      'COMPLETED',
      'CANCELLED',
    ];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const resolvedTrackingNumber =
      return_tracking_number && typeof return_tracking_number === 'string' && return_tracking_number.trim()
        ? return_tracking_number.trim()
        : `RET-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newReturn = await Return.create({
      return_tracking_number: resolvedTrackingNumber,
      product_id,
      warehouse_id: resolvedWarehouseId,
      serial_number,
      return_reason: return_reason.trim(),
      return_date,
      status,
      customer_comment,
    });

    res.status(201).json({
      success: true,
      message: 'Return created successfully',
      data: newReturn,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Return tracking number already exists',
      });
    }
    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Referenced product_id or warehouse_id does not exist',
      });
    }
    if (err.code === '23514') {
      return res.status(400).json({
        success: false,
        message: 'Constraint violation: invalid return data',
      });
    }
    next(err);
  }
}

module.exports = {
  getAllReturns,
  getReturnById,
  createReturn,
};
