const Return = require('../models/return.model');
const Inspection = require('../models/inspection.model');
const Outcome = require('../models/outcome.model');
const ApiError = require('../utils/ApiError');
const parseId = require('../utils/parseId');
const withTransaction = require('../utils/transaction');
const { createValidator } = require('../utils/validator');
const { DISPOSITIONS } = require('../utils/constants');
const { loadReturnForUser } = require('../services/returnAccess.service');

// A return can be cancelled only before a decision (docs/api.md section 3).
const CANCELLABLE_STATUSES = ['RECEIVED', 'UNDER_INSPECTION', 'EVALUATED'];

function readReturnId(req) {
  const returnId = parseId(req.params.id);
  if (returnId === null) {
    throw ApiError.badRequest('Invalid return ID');
  }
  return returnId;
}

// POST /api/returns/:id/outcome (SUPERVISOR)   DECIDED -> COMPLETED
async function recordOutcome(req, res, next) {
  try {
    const returnId = readReturnId(req);
    const values = createValidator(req.body)
      .oneOf('disposition_executed', DISPOSITIONS)
      .number('actual_revenue', { required: true, min: 0, max: 99999999.99 })
      .number('actual_cost', { required: true, min: 0, max: 99999999.99 })
      .string('execution_partner', { max: 150 })
      .date('completion_date')
      .string('outcome_notes', { max: 5000 })
      .throwIfErrors();

    await loadReturnForUser(returnId, req.user);

    const outcome = await withTransaction(async (client) => {
      const status = await Inspection.lockReturnStatus(client, returnId);
      if (status !== 'DECIDED') {
        throw ApiError.conflict(
          `An outcome can only be recorded for a DECIDED return (current status: ${status})`
        );
      }

      const decision = await Outcome.findDecisionForReturn(client, returnId);
      if (!decision) {
        throw ApiError.conflict('This return has no decision yet');
      }
      if (await Outcome.outcomeExists(client, decision.decision_id)) {
        throw ApiError.conflict('An outcome already exists for this return');
      }

      const created = await Outcome.insertOutcome(client, {
        ...values,
        decision_id: decision.decision_id,
        disposition_executed: values.disposition_executed || decision.final_disposition,
      });
      await Inspection.setReturnStatus(client, returnId, 'COMPLETED');
      return created;
    });

    res.status(201).json({
      success: true,
      message: 'Outcome recorded',
      data: { ...outcome, return_status: 'COMPLETED' },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/returns/:id/cancel (SUPERVISOR)   -> CANCELLED
async function cancelReturn(req, res, next) {
  try {
    const returnId = readReturnId(req);
    const { reason } = createValidator(req.body)
      .string('reason', { required: true, max: 500 })
      .throwIfErrors();

    await loadReturnForUser(returnId, req.user);

    await withTransaction(async (client) => {
      const status = await Inspection.lockReturnStatus(client, returnId);
      if (!CANCELLABLE_STATUSES.includes(status)) {
        throw ApiError.conflict(`A ${status} return cannot be cancelled`);
      }
      await Outcome.cancelReturn(client, returnId, reason);
    });

    res.status(200).json({
      success: true,
      message: 'Return cancelled',
      data: await Return.findById(returnId),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { recordOutcome, cancelReturn };
