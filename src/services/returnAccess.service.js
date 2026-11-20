// Warehouse privacy rules (docs/api.md section 2, "Warehouse privacy").
// An INSPECTOR only sees and acts on returns from their own warehouse.
// SUPERVISOR and ADMIN see every warehouse.
//
// Every return endpoint goes through these helpers, so the rule lives in one
// place: list filtering, single-return loading and the create check.

const Return = require('../models/return.model');
const ApiError = require('../utils/ApiError');

function isRestrictedToOwnWarehouse(user) {
  return user.app_role === 'INSPECTOR';
}

// The warehouse filter to use for a list. Inspectors always get their own
// warehouse, whatever they asked for. Others get what they asked for (or all).
function scopeWarehouseFilter(user, requestedWarehouseId) {
  if (isRestrictedToOwnWarehouse(user)) {
    return user.warehouse_id;
  }
  return requestedWarehouseId || undefined;
}

function canAccessWarehouse(user, warehouseId) {
  return !isRestrictedToOwnWarehouse(user) || user.warehouse_id === warehouseId;
}

// Loads a return the user is allowed to see, or throws 404. Another
// warehouse's return gives the same 404 as a missing one, so an inspector
// can't tell that it exists.
async function loadReturnForUser(returnId, user) {
  const returnItem = await Return.findById(returnId);
  if (!returnItem || !canAccessWarehouse(user, returnItem.warehouse_id)) {
    throw ApiError.notFound(`Return with ID ${returnId} not found`);
  }
  return returnItem;
}

// Throws 403 if the user may not create a return in this warehouse.
function assertCanCreateInWarehouse(user, warehouseId) {
  if (!canAccessWarehouse(user, warehouseId)) {
    throw ApiError.forbidden('Inspectors can only create returns for their own warehouse');
  }
}

module.exports = {
  isRestrictedToOwnWarehouse,
  scopeWarehouseFilter,
  canAccessWarehouse,
  loadReturnForUser,
  assertCanCreateInWarehouse,
};
