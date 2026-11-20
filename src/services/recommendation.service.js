// ============================================================================
// Return Loop — Decision Intelligence Recommendation Engine
// Module: src/services/recommendation.service.js
// Author: Shreyansh Rathaur (SR)
// Step: [step 26] Document the engine scoring rules, formulas & rationale
//
// 1. INPUTS:
//    - product.retail_price: Catalog retail price P (INR, >= 0).
//    - inspection.condition_grade: 'Excellent' (G=0.85), 'Good' (G=0.70), 'Fair' (G=0.50), 'Damaged' (G=0.25).
//    - inspection.functional_status: 'Fully Functional', 'Minor Glitch', 'Defective Hardware', 'Non-functional'.
//    - inspection.repair_estimate: Diagnostic repair cost R (INR, >= 0).
//    - inspection.has_original_packaging & has_all_accessories: Booleans required for pristine 'Exchange'.
//    - Handling cost: H = Math.max(200, 0.01 * P).
//
// 2. DISPOSITION RULES & FEASIBILITY:
//    - Resell:     Rev = P * G;    Cost = H;       Feasibility = 0.95 (Full+Exc/Good), 0.60 (Full+Fair), 0.30 (Minor Glitch), 0 otherwise.
//    - Refurbish:  Rev = P * 0.65; Cost = R + H;   Feasibility = 0.10 (if R > 0.6*P), else 0.90 (Minor), 0.80 (Defective), 0.50 (Full), 0.20 (Non-func).
//    - Exchange:   Rev = P * G;    Cost = H;       Feasibility = 0.90 (Full+Exc+Pkg+Acc), 0.50 (Full+Good), 0 otherwise.
//    - Donate:     Rev = P * 0.10; Cost = H;       Feasibility = 0.70 (Full/Minor), 0.10 otherwise.
//    - Recycle:    Rev = P * 0.03; Cost = H * 0.5; Feasibility = 1.00 always.
//    - Write-off:  Rev = 0;        Cost = 0;       Feasibility = 1.00 always.
//
// 3. SCORING, RANKING & TIE BREAKING:
//    - net_expected_recovery = roundMoney(estimated_revenue - estimated_cost)
//    - score = roundScore(net_expected_recovery * feasibility_score)
//    - Ranked descending by score; ties broken by: Resell > Refurbish > Exchange > Donate > Recycle > Write-off.
//
// 4. CONFIDENCE SCORE:
//    - Let s1 = top score, s2 = runner-up score.
//    - If s1 <= 0: confidence = 0.500.
//    - Else: clamp(0.5 + 0.5 * (s1 - s2) / s1, 0, 1), rounded to 3 decimal places.
//
// 5. RATIONALE:
//    - Generates a non-empty, plain-English explanation for all 6 evaluated dispositions.
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
 * Generates a concise, plain-English sentence explaining the score and feasibility
 * for each candidate disposition pathway.
 */
function buildRationale(type, { P, R, H, grade, status, hasPkg, hasAcc, rev, cost, net, feasibility, rankOrder, isRecommended }) {
  const repairPct = P > 0 ? Math.round((R / P) * 100) : 0;

  switch (type) {
    case 'Resell': {
      if (P <= 0) {
        return 'Zero retail value makes commercial resale unviable.';
      }
      if (status === 'Fully Functional' && (grade === 'Excellent' || grade === 'Good')) {
        return `Item is in ${grade.toLowerCase()} condition and fully functional; high direct resale value with minimal overhead.`;
      }
      if (status === 'Fully Functional' && grade === 'Fair') {
        return 'Item is fully functional, but fair condition reduces secondary market demand and pricing.';
      }
      if (status === 'Minor Glitch') {
        return 'Item has an operational fault, so selling as-is is risky and lowers the price.';
      }
      return 'Item is not fully functional, so it cannot be resold as-is.';
    }

    case 'Refurbish': {
      if (P > 0 && R > 0.6 * P) {
        return `Estimated repair cost of ₹${R} (${repairPct}% of retail price) exceeds 60% of retail price, making refurbishment uneconomical.`;
      }
      if (status === 'Minor Glitch') {
        if (isRecommended) {
          return `Minor glitch with a repair cost of ${repairPct}% of retail price; refurbished resale recovers the most value.`;
        }
        return `Minor glitch repair is viable at ₹${R}, but direct resale or exchange yields higher net return.`;
      }
      if (status === 'Defective Hardware') {
        if (isRecommended) {
          return `Hardware defect can be restored for ₹${R} (${repairPct}% of retail price), yielding positive net recovery via refurbished resale.`;
        }
        return `Hardware defect repair is technically feasible for ₹${R}, but other recovery paths are ranked higher.`;
      }
      if (status === 'Fully Functional') {
        return `Item is already fully functional; refurbishment cost of ₹${cost} is unnecessary compared to direct resale.`;
      }
      if (status === 'Non-functional') {
        return 'Item is completely non-functional; repair feasibility is very low and restoration is cost-prohibitive.';
      }
      return 'Refurbishment is not viable given the technical condition and restoration cost.';
    }

    case 'Exchange': {
      if (status === 'Fully Functional' && grade === 'Excellent' && hasPkg && hasAcc) {
        return 'Pristine condition with complete original packaging and accessories makes it ideal for customer warranty replacement stock.';
      }
      if (status === 'Fully Functional' && grade === 'Good') {
        return 'Good functional condition qualifies for exchange stock allocation, though cosmetic wear limits priority.';
      }
      if (status === 'Fully Functional') {
        return 'Missing original packaging or accessories prevents re-issuing this unit as customer warranty replacement stock.';
      }
      return 'Functional defects disqualify this unit from customer exchange or replacement inventory.';
    }

    case 'Donate': {
      if (isRecommended) {
        return 'Product offers meaningful social impact and tax write-off value through charitable donation channels.';
      }
      if (status === 'Fully Functional' || status === 'Minor Glitch') {
        return 'Product is usable for donation, but commercial recovery paths yield significantly higher financial returns.';
      }
      return 'Severe defects or non-functional status make this item unsuitable for charitable donation.';
    }

    case 'Recycle': {
      if (isRecommended) {
        return 'Severe physical damage or hardware failure makes raw material recycling and scrap recovery the most responsible choice.';
      }
      return 'Materials can be recycled for salvage scrap value, but higher-value recovery paths are preferable.';
    }

    case 'Write-off': {
      if (isRecommended || P <= 0) {
        return 'No economic recovery is viable; unit must be decommissioned and written off as a complete loss.';
      }
      return 'Zero financial recovery; write-off is only appropriate if all reuse and recycling avenues fail.';
    }

    default:
      return 'Alternative evaluated based on condition, repair cost, and recovery potential.';
  }
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
  const P = Math.max(0, Number(product.retail_price) || 0);
  const R = Math.max(0, Number(inspection.repair_estimate) || 0);
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
  if (P > 0 && R > 0.6 * P) {
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
    const isRecommended = rankOrder === 1;

    const rationale = buildRationale(cand.disposition_type, {
      P,
      R,
      H,
      grade,
      status,
      hasPkg,
      hasAcc,
      rev: cand.estimated_revenue,
      cost: cand.estimated_cost,
      net: cand.net_expected_recovery,
      feasibility: cand.feasibility_score,
      rankOrder,
      isRecommended,
    });

    return {
      disposition_type: cand.disposition_type,
      estimated_revenue: cand.estimated_revenue,
      estimated_cost: cand.estimated_cost,
      net_expected_recovery: cand.net_expected_recovery,
      feasibility_score: cand.feasibility_score,
      rank_order: rankOrder,
      is_recommended: isRecommended,
      rationale,
    };
  });

  const topPick = alternatives[0];

  // Confidence calculation per Step 17:
  // Let s1 and s2 be the scores of rank 1 and rank 2.
  // If s1 <= 0, confidence is 0.5.
  // Otherwise 0.5 + 0.5 * (s1 - s2) / s1, clamped to 0–1, rounded to 3 decimals.
  const s1 = scoredCandidates[0] ? scoredCandidates[0].score : 0;
  const s2 = scoredCandidates[1] ? scoredCandidates[1].score : 0;

  let confidence_score = 0.5;
  if (s1 > 0) {
    const rawConf = 0.5 + (0.5 * (s1 - s2)) / s1;
    const clamped = Math.max(0, Math.min(1, rawConf));
    confidence_score = Math.round(clamped * 1000) / 1000;
  }

  return {
    recommended_disposition: topPick.disposition_type,
    confidence_score,
    alternatives,
  };
}

module.exports = {
  recommend,
  DISPOSITION_ORDER,
  GRADE_FACTORS,
};
