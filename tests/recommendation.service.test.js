// ============================================================================
// Return Loop — Decision Intelligence Recommendation Engine Unit Tests
// Module: tests/recommendation.service.test.js
// Author: Shreyansh Rathaur (SR)
// Step: [step 21] Engine unit tests for all grades and edge cases
// ============================================================================

const { test, describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  recommend,
  DISPOSITION_ORDER,
  GRADE_FACTORS,
} = require('../src/services/recommendation.service');

const GRADES = ['Excellent', 'Good', 'Fair', 'Damaged'];
const STATUSES = ['Fully Functional', 'Minor Glitch', 'Defective Hardware', 'Non-functional'];

function assertValidRecommendation(res) {
  assert.ok(res, 'result should be defined');
  assert.ok(typeof res.recommended_disposition === 'string', 'recommended_disposition must be a string');
  assert.ok(DISPOSITION_ORDER.includes(res.recommended_disposition), 'recommended_disposition must be valid disposition');

  assert.ok(typeof res.confidence_score === 'number', 'confidence_score must be a number');
  assert.ok(!Number.isNaN(res.confidence_score), 'confidence_score must not be NaN');
  assert.ok(res.confidence_score >= 0 && res.confidence_score <= 1, `confidence_score ${res.confidence_score} must be between 0 and 1`);

  assert.ok(Array.isArray(res.alternatives), 'alternatives must be an array');
  assert.equal(res.alternatives.length, 6, 'alternatives must contain exactly 6 dispositions');

  const rankOrders = res.alternatives.map((a) => a.rank_order);
  assert.deepEqual(rankOrders, [1, 2, 3, 4, 5, 6], 'rank_order must be unique numbers 1 through 6 in ascending order');

  const recommendedItems = res.alternatives.filter((a) => a.is_recommended);
  assert.equal(recommendedItems.length, 1, 'exactly one alternative must be recommended');
  assert.equal(recommendedItems[0].rank_order, 1, 'recommended alternative must have rank_order 1');
  assert.equal(recommendedItems[0].disposition_type, res.recommended_disposition, 'recommended item must match recommended_disposition');

  for (const alt of res.alternatives) {
    assert.ok(DISPOSITION_ORDER.includes(alt.disposition_type), `unknown disposition type ${alt.disposition_type}`);
    assert.ok(typeof alt.estimated_revenue === 'number' && !Number.isNaN(alt.estimated_revenue), 'estimated_revenue must be number');
    assert.ok(typeof alt.estimated_cost === 'number' && !Number.isNaN(alt.estimated_cost), 'estimated_cost must be number');
    assert.ok(typeof alt.net_expected_recovery === 'number' && !Number.isNaN(alt.net_expected_recovery), 'net_expected_recovery must be number');

    // net_expected_recovery = revenue - cost (within floating-point rounding precision 0.01)
    const expectedNet = Math.round((alt.estimated_revenue - alt.estimated_cost) * 100) / 100;
    assert.equal(alt.net_expected_recovery, expectedNet, `net_expected_recovery must equal revenue - cost for ${alt.disposition_type}`);

    // All scores between 0 and 1
    assert.ok(typeof alt.feasibility_score === 'number', 'feasibility_score must be a number');
    assert.ok(
      alt.feasibility_score >= 0 && alt.feasibility_score <= 1,
      `feasibility_score ${alt.feasibility_score} must be between 0 and 1`
    );

    // Non-empty rationale string
    assert.ok(typeof alt.rationale === 'string', 'rationale must be a string');
    assert.ok(alt.rationale.trim().length > 0, `rationale for ${alt.disposition_type} must not be empty`);
  }
}

describe('Recommendation Engine — Condition Grade × Functional Status Matrix', () => {
  for (const grade of GRADES) {
    for (const status of STATUSES) {
      test(`evaluates grade: "${grade}" × status: "${status}" correctly`, () => {
        const res = recommend({
          product: { retail_price: 45000 },
          inspection: {
            condition_grade: grade,
            functional_status: status,
            repair_estimate: 1500,
            has_original_packaging: true,
            has_all_accessories: true,
          },
        });

        assertValidRecommendation(res);

        // Domain-specific expectations
        if (status === 'Fully Functional' && (grade === 'Excellent' || grade === 'Good')) {
          assert.equal(res.recommended_disposition, 'Resell');
        } else if (status === 'Minor Glitch') {
          assert.equal(res.recommended_disposition, 'Refurbish');
        } else if (status === 'Defective Hardware') {
          assert.equal(res.recommended_disposition, 'Refurbish');
        }
      });
    }
  }
});

describe('Recommendation Engine — Repair Estimate Threshold (>60% of Retail)', () => {
  test('repair estimate > 60% of retail price drops Refurbish feasibility to 0.10', () => {
    const P = 20000;
    const R = 13000; // 65% of retail price

    const res = recommend({
      product: { retail_price: P },
      inspection: {
        condition_grade: 'Fair',
        functional_status: 'Defective Hardware',
        repair_estimate: R,
        has_original_packaging: false,
        has_all_accessories: false,
      },
    });

    assertValidRecommendation(res);

    const refurbAlt = res.alternatives.find((a) => a.disposition_type === 'Refurbish');
    assert.ok(refurbAlt, 'Refurbish alternative must exist');
    assert.equal(refurbAlt.feasibility_score, 0.1, 'Refurbish feasibility should drop to 0.10 when R > 0.6 * P');
    assert.match(refurbAlt.rationale, /exceeds 60% of retail price/i, 'rationale should explain excessive repair cost');
    assert.notEqual(res.recommended_disposition, 'Refurbish', 'Refurbish should not be recommended when uneconomical');
  });

  test('repair estimate <= 60% of retail price keeps standard Refurbish feasibility', () => {
    const P = 20000;
    const R = 4000; // 20% of retail price

    const res = recommend({
      product: { retail_price: P },
      inspection: {
        condition_grade: 'Fair',
        functional_status: 'Defective Hardware',
        repair_estimate: R,
        has_original_packaging: false,
        has_all_accessories: false,
      },
    });

    assertValidRecommendation(res);

    const refurbAlt = res.alternatives.find((a) => a.disposition_type === 'Refurbish');
    assert.equal(refurbAlt.feasibility_score, 0.8, 'Defective Hardware feasibility should be 0.80 when repair is economical');
    assert.equal(res.recommended_disposition, 'Refurbish');
  });
});

describe('Recommendation Engine — Exchange Feasibility with Accessories & Packaging', () => {
  test('Excellent + Fully Functional + packaging + accessories yields high Exchange feasibility (0.90)', () => {
    const res = recommend({
      product: { retail_price: 50000 },
      inspection: {
        condition_grade: 'Excellent',
        functional_status: 'Fully Functional',
        repair_estimate: 0,
        has_original_packaging: true,
        has_all_accessories: true,
      },
    });

    assertValidRecommendation(res);

    const exchangeAlt = res.alternatives.find((a) => a.disposition_type === 'Exchange');
    assert.equal(exchangeAlt.feasibility_score, 0.9, 'Exchange feasibility should be 0.90 with complete packaging & accessories');
    assert.match(exchangeAlt.rationale, /pristine condition/i);
  });

  test('Missing accessories drops Exchange feasibility to 0.0 even in Excellent condition', () => {
    const res = recommend({
      product: { retail_price: 50000 },
      inspection: {
        condition_grade: 'Excellent',
        functional_status: 'Fully Functional',
        repair_estimate: 0,
        has_original_packaging: true,
        has_all_accessories: false, // missing accessories
      },
    });

    assertValidRecommendation(res);

    const exchangeAlt = res.alternatives.find((a) => a.disposition_type === 'Exchange');
    assert.equal(exchangeAlt.feasibility_score, 0.0, 'Exchange feasibility should be 0.0 when accessories are missing');
    assert.match(exchangeAlt.rationale, /missing original packaging or accessories/i);
  });

  test('Missing packaging drops Exchange feasibility to 0.0 even in Excellent condition', () => {
    const res = recommend({
      product: { retail_price: 50000 },
      inspection: {
        condition_grade: 'Excellent',
        functional_status: 'Fully Functional',
        repair_estimate: 0,
        has_original_packaging: false, // missing packaging
        has_all_accessories: true,
      },
    });

    assertValidRecommendation(res);

    const exchangeAlt = res.alternatives.find((a) => a.disposition_type === 'Exchange');
    assert.equal(exchangeAlt.feasibility_score, 0.0, 'Exchange feasibility should be 0.0 when packaging is missing');
  });

  test('Good condition yields 0.50 Exchange feasibility regardless of packaging', () => {
    const res = recommend({
      product: { retail_price: 50000 },
      inspection: {
        condition_grade: 'Good',
        functional_status: 'Fully Functional',
        repair_estimate: 0,
        has_original_packaging: false,
        has_all_accessories: false,
      },
    });

    assertValidRecommendation(res);

    const exchangeAlt = res.alternatives.find((a) => a.disposition_type === 'Exchange');
    assert.equal(exchangeAlt.feasibility_score, 0.5, 'Exchange feasibility should be 0.50 for Good condition');
  });
});

describe('Recommendation Engine — Edge Cases & Safety', () => {
  test('retail_price of 0 produces confidence_score 0.5 and valid rankings', () => {
    const res = recommend({
      product: { retail_price: 0 },
      inspection: {
        condition_grade: 'Damaged',
        functional_status: 'Non-functional',
        repair_estimate: 500,
        has_original_packaging: false,
        has_all_accessories: false,
      },
    });

    assertValidRecommendation(res);
    assert.equal(res.confidence_score, 0.5, 'confidence_score must be 0.5 when s1 <= 0');
  });

  test('handles completely empty input objects without throwing', () => {
    const res = recommend({});
    assertValidRecommendation(res);
  });

  test('handles undefined inspection fields with defaults', () => {
    const res = recommend({
      product: { retail_price: '5000.50' },
      inspection: {},
    });
    assertValidRecommendation(res);
  });

  test('clear winner produces high confidence score (> 0.7)', () => {
    const res = recommend({
      product: { retail_price: 80000 },
      inspection: {
        condition_grade: 'Good',
        functional_status: 'Minor Glitch',
        repair_estimate: 2000,
        has_original_packaging: true,
        has_all_accessories: true,
      },
    });

    assertValidRecommendation(res);
    assert.equal(res.recommended_disposition, 'Refurbish');
    assert.ok(res.confidence_score >= 0.75, `expected high confidence for clear winner, got ${res.confidence_score}`);
  });

  test('close call produces confidence score closer to 0.5', () => {
    const res = recommend({
      product: { retail_price: 50000 },
      inspection: {
        condition_grade: 'Excellent',
        functional_status: 'Fully Functional',
        repair_estimate: 0,
        has_original_packaging: true,
        has_all_accessories: true,
      },
    });

    assertValidRecommendation(res);
    // Resell (0.95 feasibility) vs Exchange (0.90 feasibility) on identical net recovery is a close call
    assert.ok(res.confidence_score < 0.6, `expected confidence close to 0.5 for close call, got ${res.confidence_score}`);
  });

  test('tie in scores breaks according to DISPOSITION_ORDER', () => {
    const res = recommend({
      product: { retail_price: 0 },
      inspection: {
        condition_grade: 'Damaged',
        functional_status: 'Non-functional',
      },
    });

    assertValidRecommendation(res);
    // When all scores are 0, tie-breaker prioritizes DISPOSITION_ORDER
    const topAlternative = res.alternatives[0];
    assert.equal(topAlternative.disposition_type, 'Resell');
  });
});
