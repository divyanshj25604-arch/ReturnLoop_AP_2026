const Return = require('../models/return.model');
const Inspection = require('../models/inspection.model');
const ApiError = require('../utils/ApiError');
const parseId = require('../utils/parseId');
const withTransaction = require('../utils/transaction');
const { createValidator } = require('../utils/validator');
const { CONDITION_GRADES, FUNCTIONAL_STATUSES } = require('../utils/constants');
const { loadReturnForUser } = require('../services/returnAccess.service');

// Statuses from which an inspection may be recorded (docs/api.md section 3).
const INSPECTABLE_STATUSES = ['RECEIVED', 'UNDER_INSPECTION', 'EVALUATED'];

function readReturnId(req) {
  const returnId = parseId(req.params.id);
  if (returnId === null) {
    throw ApiError.badRequest('Invalid return ID');
  }
  return returnId;
}

// POST /api/returns/:id/start-inspection   RECEIVED -> UNDER_INSPECTION
async function startInspection(req, res, next) {
  try {
    const returnId = readReturnId(req);
    await loadReturnForUser(returnId, req.user); // 404 for other warehouses

    await withTransaction(async (client) => {
      const status = await Inspection.lockReturnStatus(client, returnId);
      if (status !== 'RECEIVED') {
        throw ApiError.conflict(
          `Inspection can only be started for a RECEIVED return (current status: ${status})`
        );
      }
      await Inspection.setReturnStatus(client, returnId, 'UNDER_INSPECTION');
    });

    res.status(200).json({
      success: true,
      message: 'Inspection started',
      data: await Return.findById(returnId),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/returns/:id/inspections   -> EVALUATED
async function recordInspection(req, res, next) {
  try {
    const returnId = readReturnId(req);

    const values = createValidator(req.body)
      .oneOf('condition_grade', CONDITION_GRADES, { required: true })
      .oneOf('functional_status', FUNCTIONAL_STATUSES, { required: true })
      .boolean('has_original_packaging')
      .boolean('has_all_accessories')
      .number('repair_estimate', { min: 0, max: 99999999.99 })
      .string('diagnostic_notes', { max: 5000 })
      .throwIfErrors();

    await loadReturnForUser(returnId, req.user); // 404 for other warehouses

    const inspection = await withTransaction(async (client) => {
      const status = await Inspection.lockReturnStatus(client, returnId);
      if (!INSPECTABLE_STATUSES.includes(status)) {
        throw ApiError.conflict(
          `A ${status} return can no longer be inspected`
        );
      }
      const created = await Inspection.createInspection(client, {
        ...values,
        return_id: returnId,
        inspector_id: req.user.operator_id,
      });
      await Inspection.setReturnStatus(client, returnId, 'EVALUATED');
      return created;
    });

    res.status(201).json({
      success: true,
      message: 'Inspection recorded',
      data: { ...inspection, return_status: 'EVALUATED' },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { startInspection, recordInspection };
