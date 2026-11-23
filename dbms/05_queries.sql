-- ============================================================================
-- Return Loop — Production Database Queries Suite
-- Project: Return Loop (Decision Intelligence Platform for Returned Electronics)
-- Role: Database Queries & Testing / ER Documentation (Devanshi Kumari)
-- Assignment: AP CP1
-- Target Engine: PostgreSQL (v12+)
-- Standards: Executable against the relational schema (dbms/03_schema.sql)
-- ============================================================================

-- ============================================================================
-- CATEGORY A: SELECT QUERIES
-- Fundamental data retrieval across return intake, conditions, and workflows.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Query A.1: Retrieve all returned products
-- Business Purpose: Lists all returned units with associated catalog details,
-- intake date, and current reverse logistics workflow status.
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
-- Query A.2: Retrieve returns by condition
-- Business Purpose: Filters returns flagged with severe physical or hardware damage
-- to prioritize salvage, repair evaluation, or scrap processing.
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
-- Query A.3: Retrieve returns by warehouse
-- Business Purpose: Monitors intake queue and return volume for a specific regional
-- fulfillment facility (e.g., North Regional Hub: WH-DEL-01).
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
-- Query A.4: Retrieve pending disposition decisions
-- Business Purpose: Identifies returned inventory items actively undergoing intake
-- or inspection that do not yet have an authorized disposition decision.
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
-- Query A.5: Retrieve completed returns
-- Business Purpose: Audits finalized returns that have completed physical execution,
-- displaying final disposition, realized net margin, and completion date.
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


-- ============================================================================
-- CATEGORY B: JOIN QUERIES
-- Multi-table relational queries bridging master catalog, triage, and outcomes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Query B.1: Join Returns with Products
-- Relational Context: 1:N relationship (products -> returns).
-- Business Purpose: Correlates incoming return units with catalog MSRP and SKU.
-- ----------------------------------------------------------------------------
SELECT
    r.return_id,
    r.return_tracking_number,
    p.sku,
    p.brand,
    p.model_name,
    p.category,
    p.retail_price,
    r.return_reason
FROM returns r
INNER JOIN products p ON r.product_id = p.product_id
ORDER BY r.return_id ASC;

-- ----------------------------------------------------------------------------
-- Query B.2: Join Returns with Inspections
-- Relational Context: 1:N relationship (returns -> inspections).
-- Business Purpose: Links return items with their technical inspection grades,
-- completeness checklists, and repair cost estimates.
-- ----------------------------------------------------------------------------
SELECT
    r.return_id,
    r.return_tracking_number,
    i.inspection_id,
    i.condition_grade,
    i.has_original_packaging,
    i.has_all_accessories,
    i.functional_status,
    i.repair_estimate,
    i.inspected_at
FROM returns r
INNER JOIN inspections i ON r.return_id = i.return_id
ORDER BY r.return_id ASC;

-- ----------------------------------------------------------------------------
-- Query B.3: Join Returns with Warehouses
-- Relational Context: 1:N relationship (warehouses -> returns).
-- Business Purpose: Maps intake transactions to physical fulfillment facilities
-- and geographic regions.
-- ----------------------------------------------------------------------------
SELECT
    r.return_id,
    r.return_tracking_number,
    w.warehouse_id,
    w.warehouse_code,
    w.facility_name,
    w.city,
    w.state,
    r.status
FROM returns r
INNER JOIN warehouses w ON r.warehouse_id = w.warehouse_id
ORDER BY r.return_id ASC;

-- ----------------------------------------------------------------------------
-- Query B.4: Join Returns with Disposition Decisions
-- Relational Context: 1:1 relationship (returns -> disposition_decisions).
-- Business Purpose: Traces return transactions to algorithm recommendations,
-- supervisor approvals, and confidence scores.
-- ----------------------------------------------------------------------------
SELECT
    r.return_id,
    r.return_tracking_number,
    dd.decision_id,
    dd.recommended_disposition,
    dd.final_disposition,
    dd.is_override,
    dd.override_reason,
    dd.confidence_score,
    dd.decided_at
FROM returns r
INNER JOIN disposition_decisions dd ON r.return_id = dd.return_id
ORDER BY dd.decision_id ASC;

-- ----------------------------------------------------------------------------
-- Query B.5: Join Decisions with Decision Alternatives
-- Relational Context: 1:N relationship (disposition_decisions -> decision_alternatives).
-- Business Purpose: Inspects the multi-criteria candidate disposition alternatives
-- evaluated for each return decision, ordered by rank preference.
-- ----------------------------------------------------------------------------
SELECT
    dd.decision_id,
    dd.return_id,
    dd.final_disposition,
    da.alternative_id,
    da.disposition_type,
    da.estimated_revenue,
    da.estimated_cost,
    da.net_expected_recovery,
    da.feasibility_score,
    da.rank_order,
    da.is_recommended
FROM disposition_decisions dd
INNER JOIN decision_alternatives da ON dd.decision_id = da.decision_id
ORDER BY dd.decision_id ASC, da.rank_order ASC;

-- ----------------------------------------------------------------------------
-- Query B.6: Join Decisions with actual outcomes
-- Relational Context: 1:1 relationship (disposition_decisions -> decision_outcomes).
-- Business Purpose: Compares approved decisions against actual field realization,
-- tracking executed disposition channel, liquidation partners, and realized net margin.
-- ----------------------------------------------------------------------------
SELECT
    dd.decision_id,
    dd.return_id,
    dd.final_disposition,
    doc.outcome_id,
    doc.disposition_executed,
    doc.actual_revenue,
    doc.actual_cost,
    doc.actual_net_recovery,
    doc.execution_partner,
    doc.completion_date
FROM disposition_decisions dd
INNER JOIN decision_outcomes doc ON dd.decision_id = doc.decision_id
ORDER BY doc.outcome_id ASC;


-- ============================================================================
-- CATEGORY C: AGGREGATION QUERIES
-- Statistical analysis using GROUP BY, ORDER BY, COUNT, SUM, and AVG.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Query C.1: Count returns by condition
-- Aggregate Functions: COUNT(), AVG(), MIN(), MAX(), GROUP BY, ORDER BY
-- Business Purpose: Analyzes return volume distribution across condition grades
-- along with average and boundary repair estimates.
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
-- Query C.2: Count returns by disposition
-- Aggregate Functions: COUNT(), AVG(), CASE-based COUNT(), GROUP BY, ORDER BY
-- Business Purpose: Summarizes disposition distributions, highlighting operator
-- override frequency and average algorithmic confidence by channel.
-- ----------------------------------------------------------------------------
SELECT
    dd.final_disposition,
    COUNT(dd.decision_id) AS total_decisions,
    COUNT(CASE WHEN dd.is_override = TRUE THEN 1 END) AS override_count,
    ROUND(AVG(dd.confidence_score), 4) AS avg_confidence
FROM disposition_decisions dd
GROUP BY dd.final_disposition
ORDER BY total_decisions DESC;

-- ----------------------------------------------------------------------------
-- Query C.3: Calculate average recovery
-- Aggregate Functions: COUNT(), AVG(), GROUP BY, ORDER BY
-- Business Purpose: Computes average gross proceeds, repair costs, and net margin
-- realized per executed disposition channel.
-- ----------------------------------------------------------------------------
SELECT
    doc.disposition_executed,
    COUNT(doc.outcome_id) AS executed_count,
    ROUND(AVG(doc.actual_revenue), 2) AS avg_actual_revenue,
    ROUND(AVG(doc.actual_cost), 2) AS avg_actual_cost,
    ROUND(AVG(doc.actual_net_recovery), 2) AS avg_net_recovery
FROM decision_outcomes doc
GROUP BY doc.disposition_executed
ORDER BY avg_net_recovery DESC;

-- ----------------------------------------------------------------------------
-- Query C.4: Calculate total recovered value
-- Aggregate Functions: COUNT(), SUM(), GROUP BY with GROUPING SETS, ORDER BY
-- Business Purpose: Calculates total liquidation proceeds, total handling costs,
-- and total net recovered economic value across liquidation partners and grand total.
-- ----------------------------------------------------------------------------
SELECT
    COALESCE(doc.execution_partner, 'All Partners Combined') AS execution_partner,
    COUNT(doc.outcome_id) AS items_processed,
    SUM(doc.actual_revenue) AS total_revenue,
    SUM(doc.actual_cost) AS total_cost,
    SUM(doc.actual_net_recovery) AS total_recovered_value
FROM decision_outcomes doc
GROUP BY GROUPING SETS ((doc.execution_partner), ())
ORDER BY total_recovered_value DESC NULLS LAST;

-- ----------------------------------------------------------------------------
-- Query C.5: Calculate average decision confidence
-- Aggregate Functions: COUNT(), AVG(), MIN(), MAX(), GROUP BY, ORDER BY
-- Business Purpose: Measures algorithmic confidence reliability across
-- recommendation classes to identify areas needing model recalibration.
-- ----------------------------------------------------------------------------
SELECT
    dd.recommended_disposition,
    COUNT(dd.decision_id) AS sample_size,
    ROUND(AVG(dd.confidence_score), 4) AS avg_confidence_score,
    ROUND(MIN(dd.confidence_score), 4) AS min_confidence,
    ROUND(MAX(dd.confidence_score), 4) AS max_confidence
FROM disposition_decisions dd
GROUP BY dd.recommended_disposition
ORDER BY avg_confidence_score DESC;

-- ----------------------------------------------------------------------------
-- Query C.6: Calculate returns handled by each warehouse
-- Aggregate Functions: COUNT(), Conditional COUNT(), GROUP BY, ORDER BY
-- Business Purpose: Evaluates regional fulfillment center throughput, breaking
-- down workload into completed, decided, and pending returns.
-- ----------------------------------------------------------------------------
SELECT
    w.warehouse_id,
    w.warehouse_code,
    w.facility_name,
    w.city,
    COUNT(r.return_id) AS total_returns_handled,
    COUNT(CASE WHEN r.status = 'COMPLETED' THEN 1 END) AS completed_returns,
    COUNT(CASE WHEN r.status = 'DECIDED' THEN 1 END) AS decided_returns,
    COUNT(CASE WHEN r.status IN ('RECEIVED', 'UNDER_INSPECTION') THEN 1 END) AS pending_returns
FROM warehouses w
LEFT JOIN returns r ON w.warehouse_id = r.warehouse_id
GROUP BY w.warehouse_id, w.warehouse_code, w.facility_name, w.city
ORDER BY total_returns_handled DESC;


-- ============================================================================
-- CATEGORY D: INSERT QUERIES
-- Operational transaction logging for new catalog items, intakes, and triage.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Query D.1: Insert a new product
-- Target Table: products
-- Business Purpose: Registers a new electronics product into master catalog.
-- ----------------------------------------------------------------------------
INSERT INTO products (sku, brand, model_name, category, retail_price)
VALUES ('SKU-SONY-PS5SLIM', 'Sony', 'PlayStation 5 Slim (1TB Digital Edition)', 'Gaming Console', 44990.00)
RETURNING product_id, sku, brand, model_name, retail_price;

-- ----------------------------------------------------------------------------
-- Query D.2: Register a new return
-- Target Table: returns
-- Business Purpose: Logs a customer return intake package at a regional warehouse.
-- ----------------------------------------------------------------------------
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
-- Target Table: inspections
-- Business Purpose: Captures diagnostic results and condition grade upon triage.
-- ----------------------------------------------------------------------------
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
-- Target Table: disposition_decisions
-- Business Purpose: Records algorithmic recommendation and operator authorization.
-- ----------------------------------------------------------------------------
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
-- Target Table: returns
-- Business Purpose: Transitions return lifecycle state upon disposition approval.
-- ----------------------------------------------------------------------------
UPDATE returns
SET status = 'DECIDED'
WHERE return_tracking_number = 'RET-2026-0015'
RETURNING return_id, return_tracking_number, status;

-- ----------------------------------------------------------------------------
-- Query E.2: Record an operator override
-- Target Table: disposition_decisions
-- Business Purpose: Logs a supervisor decision divergence with mandatory audit rationale.
-- ----------------------------------------------------------------------------
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
-- Target Table: decision_outcomes
-- Business Purpose: Updates liquidation partner assignment and audit observations.
-- ----------------------------------------------------------------------------
UPDATE decision_outcomes
SET execution_partner = 'Cashify Certified Platinum Hub',
    outcome_notes = 'Batch inspection approved with bonus recovery rebate.'
WHERE outcome_id = 2
RETURNING outcome_id, execution_partner, outcome_notes;

-- ----------------------------------------------------------------------------
-- Query E.4: Record actual recovery
-- Target Table: decision_outcomes
-- Business Purpose: Records finalized settlement proceeds and processing expenses;
-- actual_net_recovery is automatically recalculated by generated column logic.
-- ----------------------------------------------------------------------------
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
-- Business Purpose: Safely removes an unselected candidate alternative pathway
-- (e.g., removing rank 3 alternative for decision 1) without violating FK constraints.
-- ----------------------------------------------------------------------------
DELETE FROM decision_alternatives
WHERE decision_id = 1 AND rank_order = 3
RETURNING alternative_id, decision_id, disposition_type, rank_order;
