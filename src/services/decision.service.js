// Connects the database to the pure recommendation engine
// (src/services/recommendation.service.js).

const Decision = require('../models/decision.model');
const ApiError = require('../utils/ApiError');
const { recommend } = require('./recommendation.service');

// Runs the engine for a return using its product and newest inspection.
// `client` can be the pool or a transaction client. Never writes anything.
async function buildRecommendation(client, returnId) {
  const returnInput = await Decision.findEngineReturnInput(client, returnId);
  if (!returnInput) {
    throw ApiError.notFound(`Return with ID ${returnId} not found`);
  }

  const inspection = await Decision.findLatestInspection(client, returnId);
  if (!inspection) {
    throw ApiError.conflict('This return has no inspection yet');
  }

  const result = recommend({
    product: { retail_price: returnInput.retail_price },
    inspection,
    returnInfo: { return_reason: returnInput.return_reason },
  });

  return {
    return_id: returnId,
    inspection_id: inspection.inspection_id,
    recommended_disposition: result.recommended_disposition,
    confidence_score: result.confidence_score,
    alternatives: result.alternatives,
  };
}

module.exports = { buildRecommendation };
