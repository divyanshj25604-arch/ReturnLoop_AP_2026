const Dashboard = require('../models/dashboard.model');
const ApiError = require('../utils/ApiError');
const parseId = require('../utils/parseId');

// GET /api/dashboard (SUPERVISOR)   optional ?warehouse_id=
async function getDashboard(req, res, next) {
  try {
    let warehouseId = null;
    const raw = req.query?.warehouse_id;
    if (raw !== undefined && raw !== '') {
      warehouseId = parseId(raw);
      if (warehouseId === null) {
        throw ApiError.badRequest('Invalid query parameters', [
          { field: 'warehouse_id', message: 'warehouse_id must be a positive whole number' },
        ]);
      }
    }

    const data = await Dashboard.getDashboard(warehouseId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard };
