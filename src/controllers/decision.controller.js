const db = require('../config/db');
const Decision = require('../models/decision.model');
const Inspection = require('../models/inspection.model');
const ApiError = require('../utils/ApiError');
const parseId = require('../utils/parseId');
const withTransaction = require('../utils/transaction');
const { createValidator } = require('../utils/validator');
const { DISPOSITIONS } = require('../utils/constants');
const { loadReturnForUser } = require('../services/returnAccess.service');
const { buildRecommendation } = require('../services/decision.service');

function readReturnId(req) {
  const returnId = parseId(req.params.id);
  if (returnId === null) {
    throw ApiError.badRequest('Invalid return ID');
  }
  return returnId;
}

// GET /api/returns/:id/recommendation
// Calculates the six ranked options. Nothing is saved (docs/api.md 5.6.3).
async function getRecommendation(req, res, next) {
  try {
    const returnId = readReturnId(req);
    const returnItem = await loadReturnForUser(returnId, req.user);

    if (returnItem.status !== 'EVALUATED') {
      throw ApiError.conflict(
        `Recommendations are only available for EVALUATED returns (current status: ${returnItem.status})`
      );
    }

    const recommendation = await buildRecommendation(db, returnId);
    res.status(200).json({ success: true, data: recommendation });
  } catch (err) {
    next(err);
  }
}

// POST /api/returns/:id/decision (SUPERVISOR)
// Re-runs the engine (never trusts client data) and saves the decision and all
// six alternatives in one transaction, moving the return to DECIDED.
async function makeDecision(req, res, next) {
  try {
    const returnId = readReturnId(req);
    const values = createValidator(req.body)
      .oneOf('final_disposition', DISPOSITIONS, { required: true })
      .string('override_reason', { max: 2000 })
      .throwIfErrors();

    await loadReturnForUser(returnId, req.user);

    const saved = await withTransaction(async (client) => {
      const status = await Inspection.lockReturnStatus(client, returnId);
      if (status !== 'EVALUATED') {
        throw ApiError.conflict(
          `A decision can only be made for an EVALUATED return (current status: ${status})`
        );
      }
      if (await Decision.decisionExists(client, returnId)) {
        throw ApiError.conflict('A decision already exists for this return');
      }

      const recommendation = await buildRecommendation(client, returnId);
      const isOverride = values.final_disposition !== recommendation.recommended_disposition;
      if (isOverride && !values.override_reason) {
        throw ApiError.badRequest('Validation failed', [
          {
            field: 'override_reason',
            message: `override_reason is required when choosing ${values.final_disposition} instead of the recommended ${recommendation.recommended_disposition}`,
          },
        ]);
      }

      const decision = await Decision.insertDecision(client, {
        return_id: returnId,
        recommended_disposition: recommendation.recommended_disposition,
        final_disposition: values.final_disposition,
        decided_by_operator_id: req.user.operator_id,
        is_override: isOverride,
        override_reason: isOverride ? values.override_reason : null,
        confidence_score: recommendation.confidence_score,
      });
      const alternatives = await Decision.insertAlternatives(
        client,
        decision.decision_id,
        recommendation.alternatives
      );
      await Inspection.setReturnStatus(client, returnId, 'DECIDED');

      return { decision, alternatives };
    });

    res.status(201).json({
      success: true,
      message: 'Decision recorded',
      data: { ...saved, return_status: 'DECIDED' },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getRecommendation, makeDecision };
