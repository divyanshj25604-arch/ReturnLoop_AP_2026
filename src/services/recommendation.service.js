// ============================================================================
// Return Loop — Decision Intelligence Recommendation Engine
// Module: src/services/recommendation.service.js
// Author: Shreyansh Rathaur (SR)
// Step: [step 12] Recommendation engine baseline rules & scoring
// ============================================================================

const DISPOSITION_ORDER = [
  'Resell',
  'Refurbish',
  'Exchange',
  'Donate',
  'Recycle',
  'Write-off',
];

const GRADE_FACTORS = {
  Excellent: 0.85,
  Good: 0.70,
  Fair: 0.50,
  Damaged: 0.25,
};

function roundMoney(val) {
  return Math.round((Number(val) || 0) * 100) / 100;
}

function roundScore(val) {
  return Math.round((Number(val) || 0) * 1000) / 1000;
}

/**
 * Pure function to calculate disposition recommendations and evaluate all 6 alternatives.
 *
 * @param {Object} params
 * @param {Object} params.product - { retail_price, ... }
 * @param {Object} params.inspection - { condition_grade, functional_status, repair_estimate, has_original_packaging, has_all_accessories, ... }
 * @param {Object} [params.returnInfo] - { return_reason, ... }
 * @returns {Object} { recommended_disposition, confidence_score, alternatives }
 */
function recommend({ product = {}, inspection = {}, returnInfo = {} }) {
  const P = Number(product.retail_price) || 0;
  const R = Number(inspection.repair_estimate) || 0;
  const H = Math.max(200, 0.01 * P);

  const grade = inspection.condition_grade || 'Fair';
  const status = inspection.functional_status || 'Defective Hardware';
  const hasPkg = Boolean(inspection.has_original_packaging);
  const hasAcc = Boolean(inspection.has_all_accessories);

  const G = GRADE_FACTORS[grade] !== undefined ? GRADE_FACTORS[grade] : 0.50;

  // 1. Resell
  let resellFeasibility = 0.0;
  if (status === 'Fully Functional' && (grade === 'Excellent' || grade === 'Good')) {
    resellFeasibility = 0.95;
  } else if (status === 'Fully Functional' && grade === 'Fair') {
    resellFeasibility = 0.60;
  } else if (status === 'Minor Glitch') {
    resellFeasibility = 0.30;
  }
  const resellRevenue = P * G;
  const resellCost = H;

  // 2. Refurbish
  let refurbFeasibility = 0.0;
  if (R > 0.6 * P) {
    refurbFeasibility = 0.10;
  } else if (status === 'Minor Glitch') {
    refurbFeasibility = 0.90;
  } else if (status === 'Defective Hardware') {
    refurbFeasibility = 0.80;
  } else if (status === 'Fully Functional') {
    refurbFeasibility = 0.50;
  } else if (status === 'Non-functional') {
    refurbFeasibility = 0.20;
  } else {
    refurbFeasibility = 0.10;
  }
  const refurbRevenue = P * 0.65;
  const refurbCost = R + H;

  // 3. Exchange
  let exchangeFeasibility = 0.0;
  if (status === 'Fully Functional' && grade === 'Excellent' && hasPkg && hasAcc) {
    exchangeFeasibility = 0.90;
  } else if (status === 'Fully Functional' && grade === 'Good') {
    exchangeFeasibility = 0.50;
  }
  const exchangeRevenue = P * G;
  const exchangeCost = H;

  // 4. Donate
  let donateFeasibility = 0.10;
  if (status === 'Fully Functional' || status === 'Minor Glitch') {
    donateFeasibility = 0.70;
  }
  const donateRevenue = P * 0.10;
  const donateCost = H;

  // 5. Recycle
  const recycleFeasibility = 1.00;
  const recycleRevenue = P * 0.03;
  const recycleCost = H * 0.5;

  // 6. Write-off
  const writeoffFeasibility = 1.00;
  const writeoffRevenue = 0.0;
  const writeoffCost = 0.0;

  const rawAlternatives = [
    { type: 'Resell', revenue: resellRevenue, cost: resellCost, feasibility: resellFeasibility },
    { type: 'Refurbish', revenue: refurbRevenue, cost: refurbCost, feasibility: refurbFeasibility },
    { type: 'Exchange', revenue: exchangeRevenue, cost: exchangeCost, feasibility: exchangeFeasibility },
    { type: 'Donate', revenue: donateRevenue, cost: donateCost, feasibility: donateFeasibility },
    { type: 'Recycle', revenue: recycleRevenue, cost: recycleCost, feasibility: recycleFeasibility },
    { type: 'Write-off', revenue: writeoffRevenue, cost: writeoffCost, feasibility: writeoffFeasibility },
  ];

  const scoredCandidates = rawAlternatives.map((alt) => {
    const rev = roundMoney(alt.revenue);
    const cost = roundMoney(alt.cost);
    const net = roundMoney(rev - cost);
    const feasibility = roundScore(alt.feasibility);
    const rawScore = net * feasibility;
    const score = roundScore(rawScore);

    return {
      disposition_type: alt.type,
      estimated_revenue: rev,
      estimated_cost: cost,
      net_expected_recovery: net,
      feasibility_score: feasibility,
      score,
      rationale: '',
    };
  });

  // Rank by score descending. Ties broken by DISPOSITION_ORDER index.
  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return DISPOSITION_ORDER.indexOf(a.disposition_type) - DISPOSITION_ORDER.indexOf(b.disposition_type);
  });

  const alternatives = scoredCandidates.map((cand, index) => {
    const rankOrder = index + 1;
    return {
      disposition_type: cand.disposition_type,
      estimated_revenue: cand.estimated_revenue,
      estimated_cost: cand.estimated_cost,
      net_expected_recovery: cand.net_expected_recovery,
      feasibility_score: cand.feasibility_score,
      rank_order: rankOrder,
      is_recommended: rankOrder === 1,
      rationale: cand.rationale,
    };
  });

  const topPick = alternatives[0];

  return {
    recommended_disposition: topPick.disposition_type,
    confidence_score: 0.5, // Fixed placeholder for Step 12; updated in Step 17
    alternatives,
  };
}

module.exports = {
  recommend,
  DISPOSITION_ORDER,
  GRADE_FACTORS,
};
