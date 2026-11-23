-- ============================================================================
-- Return Loop — Production Database Queries Suite
-- Project: Return Loop (Decision Intelligence Platform for Returned Electronics)
-- Role: Database Queries & Testing / ER Documentation (Devanshi Kumari)
-- Assignment: AP CP1
-- Target Engine: PostgreSQL (v12+)
-- Standards: Executable against the relational schema (dbms/03_schema.sql)
-- Classification: Each query is explicitly tagged with -- READ or -- WRITE
-- ============================================================================

-- ============================================================================
-- CATEGORY A: SELECT QUERIES
-- Fundamental data retrieval across return intake, conditions, and workflows.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Query A.1: Retrieve all returned products
-- Type: -- READ
-- Business Purpose: Lists all returned units with associated catalog details,
-- intake date, and current reverse logistics workflow status.
-- ----------------------------------------------------------------------------
-- READ
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
-- Query A.2: Retrieve returns by condition
-- Type: -- READ
-- Business Purpose: Filters returns flagged with severe physical or hardware damage
-- to prioritize salvage, repair evaluation, or scrap processing.
-- ----------------------------------------------------------------------------
-- READ
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
-- Query A.3: Retrieve returns by warehouse
-- Type: -- READ
-- Business Purpose: Monitors intake queue and return volume for a specific regional
-- fulfillment facility (e.g., North Regional Hub: WH-DEL-01).
-- ----------------------------------------------------------------------------
-- READ
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
-- Query A.4: Retrieve pending disposition decisions
-- Type: -- READ
-- Business Purpose: Identifies returned inventory items actively undergoing intake
-- or inspection that do not yet have an authorized disposition decision.
-- ----------------------------------------------------------------------------
-- READ
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
-- Query A.5: Retrieve completed returns
-- Type: -- READ
-- Business Purpose: Audits finalized returns that have completed physical execution,
-- displaying final disposition, realized net margin, and completion date.
-- ----------------------------------------------------------------------------
-- READ
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


-- ============================================================================
-- CATEGORY B: JOIN QUERIES
-- Multi-table relational queries bridging master catalog, triage, and outcomes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Query B.1: Join Returns with Products
-- Type: -- READ
-- Relational Context: 1:N relationship (products -> returns).
-- Business Purpose: Correlates incoming return units with primary catalog specs,
-- category taxonomy, and original retail purchase price.
-- ----------------------------------------------------------------------------
-- READ
SELECT
    r.return_id,
    r.return_tracking_number,
    r.serial_number,
    p.sku,
    p.brand,
    p.model_name,
    p.category,
    p.retail_price,
    r.return_date,
    r.status
FROM returns r
INNER JOIN products p ON r.product_id = p.product_id
ORDER BY r.return_date DESC;

-- ----------------------------------------------------------------------------
-- Query B.2: Join Returns with Inspections
-- Type: -- READ
-- Relational Context: 1:1 relationship (returns -> inspections).
-- Business Purpose: Combines customer return metadata with physical condition
-- triage, accessory completeness, and technician diagnostic findings.
-- ----------------------------------------------------------------------------
-- READ
SELECT
    r.return_id,
    r.return_tracking_number,
    r.return_reason,
    i.inspection_id,
    i.condition_grade,
    i.has_original_packaging,
    i.has_all_accessories,
    i.functional_status,
    i.repair_estimate,
    i.diagnostic_notes,
    i.inspected_at
FROM returns r
INNER JOIN inspections i ON r.return_id = i.return_id
ORDER BY i.inspected_at DESC;

-- ----------------------------------------------------------------------------
-- Query B.3: Join Returns with Warehouses
-- Type: -- READ
-- Relational Context: 1:N relationship (warehouses -> returns).
-- Business Purpose: Maps intake distribution against physical warehouse storage,
-- regional logistics nodes, and available square-footage capacity.
-- ----------------------------------------------------------------------------
-- READ
SELECT
    r.return_id,
    r.return_tracking_number,
    r.status,
    w.warehouse_code,
    w.facility_name,
    w.city,
    w.state,
    w.total_capacity_sqft
FROM returns r
INNER JOIN warehouses w ON r.warehouse_id = w.warehouse_id
ORDER BY w.warehouse_code ASC, r.return_date DESC;

-- ----------------------------------------------------------------------------
-- Query B.4: Join Returns with Disposition Decisions
-- Type: -- READ
-- Relational Context: 1:1 relationship (returns -> disposition_decisions).
-- Business Purpose: Evaluates algorithmic recommendations against finalized
-- disposition routes, identifying manual supervisor overrides and confidence scores.
-- ----------------------------------------------------------------------------
-- READ
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
    dd.decided_at
FROM returns r
INNER JOIN products p ON r.product_id = p.product_id
INNER JOIN disposition_decisions dd ON r.return_id = dd.return_id
ORDER BY dd.decided_at DESC;

-- ----------------------------------------------------------------------------
-- Query B.5: Join Decisions with Decision Alternatives
-- Type: -- READ
-- Relational Context: 1:N relationship (disposition_decisions -> decision_alternatives).
-- Business Purpose: Compares all ranked disposition alternatives evaluated by the
-- decision engine, contrasting expected net recovery against feasibility scores.
-- ----------------------------------------------------------------------------
-- READ
SELECT
    dd.decision_id,
    r.return_tracking_number,
    dd.final_disposition,
    da.alternative_id,
    da.disposition_type,
    da.rank_order,
    da.expected_revenue,
    da.expected_cost,
    da.expected_net_recovery,
    da.feasibility_score
FROM disposition_decisions dd
INNER JOIN returns r ON dd.return_id = r.return_id
INNER JOIN decision_alternatives da ON dd.decision_id = da.decision_id
ORDER BY dd.decision_id ASC, da.rank_order ASC;

-- ----------------------------------------------------------------------------
-- Query B.6: Join Decisions with actual outcomes
-- Type: -- READ
-- Relational Context: 1:1 relationship (disposition_decisions -> decision_outcomes).
-- Business Purpose: Reconciles algorithmic financial projections with executed
-- settlement revenue, partner channel fees, and realized net recovery.
-- ----------------------------------------------------------------------------
-- READ
SELECT
    dd.decision_id,
    r.return_tracking_number,
    p.model_name,
    dd.final_disposition,
    doc.outcome_id,
    doc.disposition_executed,
    doc.execution_partner,
    doc.actual_revenue,
    doc.actual_cost,
    doc.actual_net_recovery,
    doc.completion_date
FROM disposition_decisions dd
INNER JOIN returns r ON dd.return_id = r.return_id
INNER JOIN products p ON r.product_id = p.product_id
INNER JOIN decision_outcomes doc ON dd.decision_id = doc.decision_id
ORDER BY doc.completion_date DESC;


-- ============================================================================
-- CATEGORY C: AGGREGATE QUERIES (GROUP BY, HAVING, STATISTICAL METRICS)
-- Analytics across reverse supply chain throughput, recovery, and reliability.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Query C.1: Count returns by condition
-- Type: -- READ
-- Business Purpose: Quantifies distribution of cosmetic and functional condition
-- grades across all processed items to gauge incoming stock quality.
-- ----------------------------------------------------------------------------
-- READ
SELECT
    i.condition_grade,
    COUNT(i.inspection_id) AS total_inspections,
    ROUND(AVG(i.repair_estimate), 2) AS avg_repair_estimate,
    MIN(i.repair_estimate) AS min_repair_estimate,
    MAX(i.repair_estimate) AS max_repair_estimate
FROM inspections i
GROUP BY i.condition_grade
ORDER BY total_inspections DESC;

-- ----------------------------------------------------------------------------
-- Query C.2: Count returns by disposition
-- Type: -- READ
-- Business Purpose: Analyzes distribution of final routing pathways (Resell,
-- Refurbish, Liquidate, Return to Vendor, Recycle).
-- ----------------------------------------------------------------------------
-- READ
SELECT
    dd.final_disposition,
    COUNT(dd.decision_id) AS total_decisions,
    ROUND(AVG(dd.confidence_score), 4) AS avg_confidence,
    SUM(CASE WHEN dd.is_override = TRUE THEN 1 ELSE 0 END) AS total_overrides
FROM disposition_decisions dd
GROUP BY dd.final_disposition
ORDER BY total_decisions DESC;

-- ----------------------------------------------------------------------------
-- Query C.3: Calculate average recovery
-- Type: -- READ
-- Business Purpose: Measures mean gross proceeds, costs, and net realized recovery
-- partitioned across each executed disposition channel.
-- ----------------------------------------------------------------------------
-- READ
SELECT
    doc.disposition_executed,
    COUNT(doc.outcome_id) AS items_executed,
    ROUND(AVG(doc.actual_revenue), 2) AS avg_gross_revenue,
    ROUND(AVG(doc.actual_cost), 2) AS avg_processing_cost,
    ROUND(AVG(doc.actual_net_recovery), 2) AS avg_net_recovery
FROM decision_outcomes doc
GROUP BY doc.disposition_executed
ORDER BY avg_net_recovery DESC;

-- ----------------------------------------------------------------------------
-- Query C.4: Calculate total recovered value
-- Type: -- READ
-- Business Purpose: Summarizes aggregate monetary recovery per product category,
-- filtering with HAVING to isolate high-yield categories (> ₹10,000 net).
-- ----------------------------------------------------------------------------
-- READ
SELECT
    p.category,
    COUNT(doc.outcome_id) AS units_recovered,
    ROUND(SUM(doc.actual_revenue), 2) AS total_gross_recovered,
    ROUND(SUM(doc.actual_cost), 2) AS total_channel_cost,
    ROUND(SUM(doc.actual_net_recovery), 2) AS total_net_recovered
FROM decision_outcomes doc
JOIN disposition_decisions dd ON doc.decision_id = dd.decision_id
JOIN returns r ON dd.return_id = r.return_id
JOIN products p ON r.product_id = p.product_id
GROUP BY p.category
HAVING SUM(doc.actual_net_recovery) > 10000.00
ORDER BY total_net_recovered DESC;

-- ----------------------------------------------------------------------------
-- Query C.5: Calculate average decision confidence
-- Type: -- READ
-- Business Purpose: Computes system decision certainty across product categories,
-- isolating product families with more than 1 processed return.
-- ----------------------------------------------------------------------------
-- READ
SELECT
    p.category,
    COUNT(dd.decision_id) AS total_decisions_evaluated,
    ROUND(AVG(dd.confidence_score), 4) AS avg_model_confidence,
    MIN(dd.confidence_score) AS min_confidence,
    MAX(dd.confidence_score) AS max_confidence
FROM disposition_decisions dd
JOIN returns r ON dd.return_id = r.return_id
JOIN products p ON r.product_id = p.product_id
GROUP BY p.category
HAVING COUNT(dd.decision_id) > 1
ORDER BY avg_model_confidence DESC;

-- ----------------------------------------------------------------------------
-- Query C.6: Calculate returns handled by each warehouse
-- Type: -- READ
-- Business Purpose: Measures intake processing throughput across all warehouses,
-- computing current active backlog vs completed items.
-- ----------------------------------------------------------------------------
-- READ
SELECT
    w.warehouse_id,
    w.warehouse_code,
    w.facility_name,
    w.city,
    COUNT(r.return_id) AS total_returns_received,
    SUM(CASE WHEN r.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_returns,
    SUM(CASE WHEN r.status NOT IN ('COMPLETED', 'CANCELLED') THEN 1 ELSE 0 END) AS active_backlog
FROM warehouses w
LEFT JOIN returns r ON w.warehouse_id = r.warehouse_id
GROUP BY w.warehouse_id, w.warehouse_code, w.facility_name, w.city
ORDER BY total_returns_received DESC;


-- ============================================================================
-- CATEGORY D: INSERT QUERIES
-- Transactional data ingress across catalog ingestion, intake triage, and decisioning.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Query D.1: Insert a new product
-- Type: -- WRITE
-- Target Table: products
-- Business Purpose: Onboards a newly supported SKU into the electronics master catalog.
-- ----------------------------------------------------------------------------
-- WRITE
INSERT INTO products (sku, brand, model_name, category, retail_price)
VALUES (
    'SKU-APP-AIRPODP2',
    'Apple',
    'AirPods Pro (2nd Generation, USB-C)',
    'Audio',
    24900.00
)
ON CONFLICT (sku) DO UPDATE
SET retail_price = EXCLUDED.retail_price
RETURNING product_id, sku, brand, model_name, retail_price;

-- ----------------------------------------------------------------------------
-- Query D.2: Register a new return
-- Type: -- WRITE
-- Target Table: returns
-- Business Purpose: Creates an intake tracking record for an item received at warehouse.
-- ----------------------------------------------------------------------------
-- WRITE
INSERT INTO returns (return_tracking_number, product_id, warehouse_id, serial_number, return_reason, return_date, status, customer_comment)
VALUES (
    'RET-2026-0015',
    (SELECT product_id FROM products WHERE sku = 'SKU-SONY-PS5SLIM'),
    1,
    'SN-PS5-9081273645',
    'Unwanted birthday gift / duplicate order',
    CURRENT_DATE,
    'RECEIVED',
    'Package intact, factory seal unblemished.'
)
RETURNING return_id, return_tracking_number, product_id, status;

-- ----------------------------------------------------------------------------
-- Query D.3: Record an inspection
-- Type: -- WRITE
-- Target Table: inspections
-- Business Purpose: Captures diagnostic results and condition grade upon triage.
-- ----------------------------------------------------------------------------
-- WRITE
INSERT INTO inspections (return_id, inspector_id, condition_grade, has_original_packaging, has_all_accessories, functional_status, repair_estimate, diagnostic_notes)
VALUES (
    (SELECT return_id FROM returns WHERE return_tracking_number = 'RET-2026-0015'),
    1,
    'Excellent',
    TRUE,
    TRUE,
    'Fully Functional',
    0.00,
    'Original box seal verified intact. Device never powered on. 100% factory pristine.'
)
RETURNING inspection_id, return_id, condition_grade, functional_status;

-- ----------------------------------------------------------------------------
-- Query D.4: Insert a disposition decision
-- Type: -- WRITE
-- Target Table: disposition_decisions
-- Business Purpose: Records algorithmic recommendation and operator authorization.
-- ----------------------------------------------------------------------------
-- WRITE
INSERT INTO disposition_decisions (return_id, recommended_disposition, final_disposition, decided_by_operator_id, is_override, override_reason, confidence_score)
VALUES (
    (SELECT return_id FROM returns WHERE return_tracking_number = 'RET-2026-0015'),
    'Resell',
    'Resell',
    1,
    FALSE,
    NULL,
    0.990
)
RETURNING decision_id, return_id, final_disposition, confidence_score;


-- ============================================================================
-- CATEGORY E: UPDATE QUERIES
-- Pipeline state transitions, operator overrides, and recovery reconciliation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Query E.1: Update return status
-- Type: -- WRITE
-- Target Table: returns
-- Business Purpose: Transitions return lifecycle state upon disposition approval.
-- ----------------------------------------------------------------------------
-- WRITE
UPDATE returns
SET status = 'DECIDED'
WHERE return_tracking_number = 'RET-2026-0015'
RETURNING return_id, return_tracking_number, status;

-- ----------------------------------------------------------------------------
-- Query E.2: Record an operator override
-- Type: -- WRITE
-- Target Table: disposition_decisions
-- Business Purpose: Logs a supervisor decision divergence with mandatory audit rationale.
-- ----------------------------------------------------------------------------
-- WRITE
UPDATE disposition_decisions
SET is_override = TRUE,
    final_disposition = 'Donate',
    override_reason = 'Manager authorized corporate donation to local vocational training school.',
    decided_by_operator_id = 1,
    decided_at = CURRENT_TIMESTAMP
WHERE decision_id = 8
RETURNING decision_id, return_id, recommended_disposition, final_disposition, is_override, override_reason;

-- ----------------------------------------------------------------------------
-- Query E.3: Update disposition outcome
-- Type: -- WRITE
-- Target Table: decision_outcomes
-- Business Purpose: Updates liquidation partner assignment and audit observations.
-- ----------------------------------------------------------------------------
-- WRITE
UPDATE decision_outcomes
SET execution_partner = 'Cashify Certified Platinum Hub',
    outcome_notes = 'Batch inspection approved with bonus recovery rebate.'
WHERE outcome_id = 2
RETURNING outcome_id, execution_partner, outcome_notes;

-- ----------------------------------------------------------------------------
-- Query E.4: Record actual recovery
-- Type: -- WRITE
-- Target Table: decision_outcomes
-- Business Purpose: Records finalized settlement proceeds and processing expenses;
-- actual_net_recovery is automatically recalculated by generated column logic.
-- ----------------------------------------------------------------------------
-- WRITE
UPDATE decision_outcomes
SET actual_revenue = 65200.00,
    actual_cost = 3800.00
WHERE outcome_id = 2
RETURNING outcome_id, actual_revenue, actual_cost, actual_net_recovery;


-- ============================================================================
-- CATEGORY F: DELETE QUERY & FOREIGN-KEY RESTRICTION EXPLANATION
-- Controlled record removal and referential integrity enforcement.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Query F.1: Controlled Deletion Example
-- Type: -- WRITE
-- Business Purpose: Safely removes an unselected candidate alternative pathway
-- (e.g., removing rank 3 alternative for decision 1) without violating FK constraints.
-- ----------------------------------------------------------------------------
-- WRITE
DELETE FROM decision_alternatives
WHERE decision_id = 1 AND rank_order = 3
RETURNING alternative_id, decision_id, disposition_type, rank_order;
