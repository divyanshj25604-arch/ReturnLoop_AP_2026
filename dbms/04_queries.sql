-- ============================================================================
-- Return Loop — Production Database Queries Suite (CP3 / CP4)
-- Project: Return Loop (Decision Intelligence Platform for Returned Electronics)
-- Component: dbms/04_queries.sql
-- Role: Database Architecture & Queries (Shreyansh Rathaur / Devanshi Kumari)
-- Standard: Compliant with AP Checkpoint 3 and Checkpoint 4 Specifications
-- Engine: PostgreSQL (v12+)
-- Standards: Annotated with -- READ or -- WRITE and Query IDs (R1, R2, ... W1, W2, ...)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Query R1 [READ]: Retrieve all returned products with catalog specifications
-- (Original Reference: Query A.1)
-- ----------------------------------------------------------------------------
SELECT
    r.return_id,
    r.return_tracking_number,
    r.product_id,
    p.sku,
    p.brand,
    p.model_name,
    p.category,
    r.return_date,
    r.status
FROM returns r
JOIN products p ON r.product_id = p.product_id
ORDER BY r.return_id ASC;

-- ----------------------------------------------------------------------------
-- Query R2 [READ]: Retrieve returns by condition (Damaged items for salvage)
-- (Original Reference: Query A.2)
-- ----------------------------------------------------------------------------
SELECT
    r.return_id,
    r.return_tracking_number,
    p.model_name,
    i.condition_grade,
    i.functional_status,
    i.repair_estimate
FROM returns r
JOIN products p ON r.product_id = p.product_id
JOIN inspections i ON r.return_id = i.return_id
WHERE i.condition_grade = 'Damaged'
ORDER BY i.repair_estimate DESC;

-- ----------------------------------------------------------------------------
-- Query R3 [READ]: Retrieve returns by regional warehouse (WH-DEL-01)
-- (Original Reference: Query A.3)
-- ----------------------------------------------------------------------------
SELECT
    r.return_id,
    r.return_tracking_number,
    w.warehouse_code,
    w.facility_name,
    w.city,
    r.return_date,
    r.status
FROM returns r
JOIN warehouses w ON r.warehouse_id = w.warehouse_id
WHERE w.warehouse_code = 'WH-DEL-01'
ORDER BY r.return_date DESC;

-- ----------------------------------------------------------------------------
-- Query R4 [READ]: Retrieve pending disposition decisions
-- (Original Reference: Query A.4)
-- ----------------------------------------------------------------------------
SELECT
    r.return_id,
    r.return_tracking_number,
    p.model_name,
    r.status,
    r.return_date,
    r.return_reason
FROM returns r
JOIN products p ON r.product_id = p.product_id
LEFT JOIN disposition_decisions dd ON r.return_id = dd.return_id
WHERE dd.decision_id IS NULL
  AND r.status != 'CANCELLED'
ORDER BY r.return_date ASC;

-- ----------------------------------------------------------------------------
-- Query R5 [READ]: Retrieve completed returns with realized financial recovery
-- (Original Reference: Query A.5)
-- ----------------------------------------------------------------------------
SELECT
    r.return_id,
    r.return_tracking_number,
    p.model_name,
    r.status,
    dd.final_disposition,
    doc.disposition_executed,
    doc.actual_net_recovery,
    doc.completion_date
FROM returns r
JOIN products p ON r.product_id = p.product_id
JOIN disposition_decisions dd ON r.return_id = dd.return_id
JOIN decision_outcomes doc ON dd.decision_id = doc.decision_id
WHERE r.status = 'COMPLETED'
ORDER BY doc.completion_date DESC;

-- ----------------------------------------------------------------------------
-- Query R6 [READ]: Join Returns with Products catalog specifications
-- (Original Reference: Query B.1)
-- ----------------------------------------------------------------------------
SELECT
    r.return_id,
    r.return_tracking_number,
    r.serial_number,
    r.status,
    p.sku,
    p.brand,
    p.model_name,
    p.category,
    p.retail_price
FROM returns r
JOIN products p ON r.product_id = p.product_id
ORDER BY r.return_id ASC;

-- ----------------------------------------------------------------------------
-- Query R7 [READ]: Join Returns with Technical Inspections checklist
-- (Original Reference: Query B.2)
-- ----------------------------------------------------------------------------
SELECT
    r.return_id,
    r.return_tracking_number,
    p.model_name,
    i.inspection_id,
    i.condition_grade,
    i.functional_status,
    i.has_original_packaging,
    i.has_all_accessories,
    i.repair_estimate,
    o.full_name AS inspector_name
FROM returns r
JOIN products p ON r.product_id = p.product_id
JOIN inspections i ON r.return_id = i.return_id
JOIN operators o ON i.inspector_id = o.operator_id
ORDER BY i.inspected_at DESC;

-- ----------------------------------------------------------------------------
-- Query R8 [READ]: Join Returns with Regional Warehouses
-- (Original Reference: Query B.3)
-- ----------------------------------------------------------------------------
SELECT
    r.return_id,
    r.return_tracking_number,
    r.return_date,
    r.status,
    w.warehouse_code,
    w.facility_name,
    w.city,
    w.state
FROM returns r
JOIN warehouses w ON r.warehouse_id = w.warehouse_id
ORDER BY w.warehouse_code ASC, r.return_date DESC;

-- ----------------------------------------------------------------------------
-- Query R9 [READ]: Join Returns with Disposition Decisions
-- (Original Reference: Query B.4)
-- ----------------------------------------------------------------------------
SELECT
    r.return_id,
    r.return_tracking_number,
    p.model_name,
    dd.decision_id,
    dd.recommended_disposition,
    dd.final_disposition,
    dd.is_override,
    dd.override_reason,
    dd.confidence_score,
    o.full_name AS decided_by_operator
FROM returns r
JOIN products p ON r.product_id = p.product_id
JOIN disposition_decisions dd ON r.return_id = dd.return_id
JOIN operators o ON dd.decided_by_operator_id = o.operator_id
ORDER BY dd.decided_at DESC;

-- ----------------------------------------------------------------------------
-- Query R10 [READ]: Join Decisions with Decision Alternatives (all 6 pathways)
-- (Original Reference: Query B.5)
-- ----------------------------------------------------------------------------
SELECT
    dd.decision_id,
    r.return_tracking_number,
    dd.final_disposition,
    da.disposition_type,
    da.estimated_revenue,
    da.estimated_cost,
    da.net_expected_recovery,
    da.feasibility_score,
    da.rank_order,
    da.is_recommended
FROM disposition_decisions dd
JOIN returns r ON dd.return_id = r.return_id
JOIN decision_alternatives da ON dd.decision_id = da.decision_id
WHERE dd.decision_id = 1
ORDER BY da.rank_order ASC;

-- ----------------------------------------------------------------------------
-- Query R11 [READ]: Join Decisions with actual executed outcomes
-- (Original Reference: Query B.6)
-- ----------------------------------------------------------------------------
SELECT
    dd.decision_id,
    r.return_tracking_number,
    p.model_name,
    dd.final_disposition,
    doc.disposition_executed,
    doc.actual_revenue,
    doc.actual_cost,
    doc.actual_net_recovery,
    doc.execution_partner,
    doc.completion_date
FROM disposition_decisions dd
JOIN returns r ON dd.return_id = r.return_id
JOIN products p ON r.product_id = p.product_id
JOIN decision_outcomes doc ON dd.decision_id = doc.decision_id
ORDER BY doc.actual_net_recovery DESC;

-- ----------------------------------------------------------------------------
-- Query R12 [READ]: Count returns grouped by condition grade
-- (Original Reference: Query C.1)
-- ----------------------------------------------------------------------------
SELECT
    i.condition_grade,
    COUNT(r.return_id) AS total_returns,
    ROUND(AVG(i.repair_estimate), 2) AS avg_repair_estimate,
    MIN(i.repair_estimate) AS min_repair_estimate,
    MAX(i.repair_estimate) AS max_repair_estimate
FROM inspections i
JOIN returns r ON i.return_id = r.return_id
GROUP BY i.condition_grade
ORDER BY total_returns DESC;

-- ----------------------------------------------------------------------------
-- Query R13 [READ]: Count returns grouped by recommended disposition
-- (Original Reference: Query C.2)
-- ----------------------------------------------------------------------------
SELECT
    dd.recommended_disposition,
    COUNT(dd.decision_id) AS total_decisions,
    SUM(CASE WHEN dd.is_override = TRUE THEN 1 ELSE 0 END) AS total_overrides,
    ROUND(
        (SUM(CASE WHEN dd.is_override = TRUE THEN 1 ELSE 0 END)::NUMERIC / COUNT(dd.decision_id)) * 100,
        2
    ) AS override_rate_percent,
    ROUND(AVG(dd.confidence_score), 3) AS avg_confidence_score
FROM disposition_decisions dd
GROUP BY dd.recommended_disposition
ORDER BY total_decisions DESC;

-- ----------------------------------------------------------------------------
-- Query R14 [READ]: Calculate average net recovery by executed disposition channel
-- (Original Reference: Query C.3)
-- ----------------------------------------------------------------------------
SELECT
    doc.disposition_executed,
    COUNT(doc.outcome_id) AS items_processed,
    ROUND(AVG(doc.actual_revenue), 2) AS avg_gross_revenue,
    ROUND(AVG(doc.actual_cost), 2) AS avg_processing_cost,
    ROUND(AVG(doc.actual_net_recovery), 2) AS avg_net_recovery,
    ROUND(SUM(doc.actual_net_recovery), 2) AS total_net_recovery
FROM decision_outcomes doc
GROUP BY doc.disposition_executed
ORDER BY total_net_recovery DESC;

-- ----------------------------------------------------------------------------
-- Query R15 [READ]: Calculate total recovered salvage value by liquidation partner
-- (Original Reference: Query C.4)
-- ----------------------------------------------------------------------------
SELECT
    COALESCE(doc.execution_partner, 'Internal Fulfillment / Scrapped') AS execution_partner,
    COUNT(doc.outcome_id) AS processed_batches,
    ROUND(SUM(doc.actual_revenue), 2) AS total_revenue,
    ROUND(SUM(doc.actual_cost), 2) AS total_cost,
    ROUND(SUM(doc.actual_net_recovery), 2) AS total_salvage_realized
FROM decision_outcomes doc
GROUP BY doc.execution_partner
ORDER BY total_salvage_realized DESC;

-- ----------------------------------------------------------------------------
-- Query R16 [READ]: Calculate average decision confidence score across all decisions
-- (Original Reference: Query C.5)
-- ----------------------------------------------------------------------------
SELECT
    ROUND(AVG(confidence_score), 3) AS overall_avg_confidence,
    ROUND(MIN(confidence_score), 3) AS min_confidence,
    ROUND(MAX(confidence_score), 3) AS max_confidence,
    COUNT(*) FILTER (WHERE confidence_score >= 0.800) AS high_confidence_count,
    COUNT(*) FILTER (WHERE confidence_score < 0.800) AS low_confidence_count
FROM disposition_decisions;

-- ----------------------------------------------------------------------------
-- Query R17 [READ]: Calculate returns handled by each warehouse facility
-- (Original Reference: Query C.6)
-- ----------------------------------------------------------------------------
SELECT
    w.warehouse_id,
    w.warehouse_code,
    w.facility_name,
    w.city,
    w.capacity,
    COUNT(r.return_id) AS total_returns_handled,
    COUNT(r.return_id) FILTER (WHERE r.status = 'COMPLETED') AS completed_returns,
    COUNT(r.return_id) FILTER (WHERE r.status != 'COMPLETED' AND r.status != 'CANCELLED') AS active_queue,
    ROUND((COUNT(r.return_id)::NUMERIC / w.capacity) * 100, 2) AS intake_utilization_percent
FROM warehouses w
LEFT JOIN returns r ON w.warehouse_id = r.warehouse_id
GROUP BY w.warehouse_id, w.warehouse_code, w.facility_name, w.city, w.capacity
ORDER BY total_returns_handled DESC;

-- ----------------------------------------------------------------------------
-- Query R18 [READ]: Authenticate operator by email (Auth Login query)
-- (Original Reference: Query APP.1)
-- ----------------------------------------------------------------------------
SELECT operator_id, employee_code, full_name, email, password_hash, app_role, warehouse_id, is_active
FROM operators
WHERE LOWER(email) = LOWER('rajesh.sharma@returnloop.internal');

-- ----------------------------------------------------------------------------
-- Query R19 [READ]: Executive Dashboard summary metrics (status counts, revenue, recovery rate)
-- (Original Reference: Query APP.2)
-- ----------------------------------------------------------------------------
SELECT
  COUNT(*)::int AS total_returns,
  COUNT(*) FILTER (WHERE status = 'RECEIVED')::int AS received,
  COUNT(*) FILTER (WHERE status = 'UNDER_INSPECTION')::int AS under_inspection,
  COUNT(*) FILTER (WHERE status = 'EVALUATED')::int AS evaluated,
  COUNT(*) FILTER (WHERE status = 'DECIDED')::int AS decided,
  COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
  COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled
FROM returns;

-- ----------------------------------------------------------------------------
-- Query W1 [WRITE]: Insert a new product into master catalog
-- (Original Reference: Query D.1)
-- ----------------------------------------------------------------------------
INSERT INTO products (sku, brand, model_name, category, retail_price)
VALUES ('SKU-TEST-PLAN-001', 'Logitech', 'MX Master 3S Wireless Mouse', 'Peripherals', 8995.00)
RETURNING product_id, sku, model_name, retail_price;

-- ----------------------------------------------------------------------------
-- Query W2 [WRITE]: Register a new incoming return intake record
-- (Original Reference: Query D.2)
-- ----------------------------------------------------------------------------
INSERT INTO returns (
    return_tracking_number, product_id, warehouse_id,
    serial_number, return_reason, return_date, status, customer_comment
) VALUES (
    'RET-2026-PLAN-001', 1, 1,
    'SN-PLAN-TEST-99', 'Defective upon arrival', CURRENT_DATE, 'RECEIVED',
    'Device failed initial power-on diagnostics.'
) RETURNING return_id, return_tracking_number, status;

-- ----------------------------------------------------------------------------
-- Query W3 [WRITE]: Record a multi-point technical inspection
-- (Original Reference: Query D.3)
-- ----------------------------------------------------------------------------
INSERT INTO inspections (
    return_id, inspector_id, condition_grade,
    has_original_packaging, has_all_accessories,
    functional_status, repair_estimate, diagnostic_notes
) VALUES (
    12, 1, 'Good',
    TRUE, TRUE,
    'Minor Glitch', 1200.00,
    'Firmware recalibration needed; cosmetic casing intact.'
) RETURNING inspection_id, condition_grade, functional_status, repair_estimate;

-- ----------------------------------------------------------------------------
-- Query W4 [WRITE]: Insert an approved disposition decision
-- (Original Reference: Query D.4)
-- ----------------------------------------------------------------------------
INSERT INTO disposition_decisions (
    return_id, recommended_disposition, final_disposition,
    decided_by_operator_id, is_override, override_reason, confidence_score
) VALUES (
    10, 'Resell', 'Resell',
    1, FALSE, NULL, 0.950
) RETURNING decision_id, return_id, final_disposition, confidence_score;

-- ----------------------------------------------------------------------------
-- Query W5 [WRITE]: Update return lifecycle status to DECIDED
-- (Original Reference: Query E.1)
-- ----------------------------------------------------------------------------
UPDATE returns
SET status = 'DECIDED'
WHERE return_id = 1
RETURNING return_id, return_tracking_number, status;

-- ----------------------------------------------------------------------------
-- Query W6 [WRITE]: Record an operator override with audit reason
-- (Original Reference: Query E.2)
-- ----------------------------------------------------------------------------
UPDATE disposition_decisions
SET is_override = TRUE,
    final_disposition = 'Donate',
    override_reason = 'Manager authorized corporate donation to local training center.',
    decided_by_operator_id = 1,
    decided_at = CURRENT_TIMESTAMP
WHERE decision_id = 1
RETURNING decision_id, return_id, recommended_disposition, final_disposition, is_override;

-- ----------------------------------------------------------------------------
-- Query W7 [WRITE]: Update disposition outcome execution partner & notes
-- (Original Reference: Query E.3)
-- ----------------------------------------------------------------------------
UPDATE decision_outcomes
SET execution_partner = 'Cashify Certified Platinum Hub',
    outcome_notes = 'Batch inspection approved with bonus recovery rebate.'
WHERE outcome_id = 1
RETURNING outcome_id, execution_partner, outcome_notes;

-- ----------------------------------------------------------------------------
-- Query W8 [WRITE]: Record actual financial recovery revenue and processing cost
-- (Original Reference: Query E.4)
-- ----------------------------------------------------------------------------
UPDATE decision_outcomes
SET actual_revenue = 65000.00,
    actual_cost = 3500.00
WHERE outcome_id = 1
RETURNING outcome_id, actual_revenue, actual_cost, actual_net_recovery;

-- ----------------------------------------------------------------------------
-- Query W9 [WRITE]: Controlled deletion of unselected candidate alternative
-- (Original Reference: Query F.1)
-- ----------------------------------------------------------------------------
DELETE FROM decision_alternatives
WHERE decision_id = 1 AND rank_order = 6
RETURNING alternative_id, decision_id, disposition_type, rank_order;

