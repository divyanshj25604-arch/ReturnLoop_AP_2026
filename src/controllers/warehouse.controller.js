const Warehouse = require('../models/warehouse.model');
const ApiError = require('../utils/ApiError');
const parseId = require('../utils/parseId');
const { createValidator } = require('../utils/validator');

// Field rules for POST (all required) and PATCH (all optional).
function validateWarehouse(body, { partial }) {
  const required = !partial;
  return createValidator(body)
    .string('warehouse_code', { required, max: 20 })
    .string('facility_name', { required, max: 100 })
    .string('city', { required, max: 50 })
    .string('state', { required, max: 50 })
    .number('capacity', { required, integer: true, min: 1 })
    .throwIfErrors();
}

function handleDbError(err, next) {
  if (err.code === '23505') {
    return next(ApiError.conflict('A warehouse with this warehouse_code already exists'));
  }
  return next(err);
}

// GET /api/warehouses (any logged-in user; used for dropdowns)
async function getAllWarehouses(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await Warehouse.findAll() });
  } catch (err) {
    next(err);
  }
}

// POST /api/warehouses (ADMIN)
async function createWarehouse(req, res, next) {
  try {
    const values = validateWarehouse(req.body, { partial: false });
    const warehouse = await Warehouse.create(values);
    res.status(201).json({ success: true, message: 'Warehouse created', data: warehouse });
  } catch (err) {
    handleDbError(err, next);
  }
}

// PATCH /api/warehouses/:id (ADMIN)
async function updateWarehouse(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      throw ApiError.badRequest('Invalid warehouse ID');
    }
    const values = validateWarehouse(req.body, { partial: true });
    const warehouse = await Warehouse.update(id, values);
    if (!warehouse) {
      throw ApiError.notFound(`Warehouse with ID ${id} not found`);
    }
    res.status(200).json({ success: true, message: 'Warehouse updated', data: warehouse });
  } catch (err) {
    handleDbError(err, next);
  }
}

module.exports = { getAllWarehouses, createWarehouse, updateWarehouse };
