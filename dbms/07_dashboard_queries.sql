-- ============================================================================
-- Return Loop — Executive Dashboard Analytics Queries Suite
-- Project: Return Loop (Decision Intelligence Platform for Returned Electronics)
-- Step: [step 29] Dashboard SQL
-- Role: Database Queries & Performance Analytics (Devanshi Kumari)
-- Standards: Compliant with PostgreSQL 12+ (psql / node-pg)
-- Reference: docs/api.md Section 5.7 (GET /api/dashboard)
-- ============================================================================

-- ============================================================================
-- 1. Returns by Status
-- Business Purpose: Aggregates intake volume across each reverse logistics lifecycle
-- status. Ensures all six defined workflow statuses are represented (defaulting to 0).
-- ============================================================================

-- 1A. All Warehouses (Enterprise Overview)
SELECT
    s.status,
    COALESCE(COUNT(r.return_id), 0)::int AS count
FROM (
    VALUES 
        ('RECEIVED'), 
        ('UNDER_INSPECTION'), 
        ('EVALUATED'), 
        ('DECIDED'), 
        ('COMPLETED'), 
        ('CANCELLED')
) AS s(status)
LEFT JOIN returns r ON r.status = s.status
GROUP BY s.status
ORDER BY CASE s.status
    WHEN 'RECEIVED' THEN 1
    WHEN 'UNDER_INSPECTION' THEN 2
    WHEN 'EVALUATED' THEN 3
    WHEN 'DECIDED' THEN 4
    WHEN 'COMPLETED' THEN 5
    WHEN 'CANCELLED' THEN 6
END;

/* Sample Output (All Warehouses):
 status           | count
------------------+-------
 RECEIVED         |     2
 UNDER_INSPECTION |     1
 EVALUATED        |     1
 DECIDED          |     3
 COMPLETED        |     6
 CANCELLED        |     1
(6 rows)
*/

-- 1B. Filtered by Warehouse (Parameterized: :warehouse_id or $1 = 1)
SELECT
    s.status,
    COALESCE(COUNT(r.return_id), 0)::int AS count
FROM (
    VALUES 
        ('RECEIVED'), 
        ('UNDER_INSPECTION'), 
        ('EVALUATED'), 
        ('DECIDED'), 
        ('COMPLETED'), 
        ('CANCELLED')
) AS s(status)
LEFT JOIN returns r ON r.status = s.status AND r.warehouse_id = 1
GROUP BY s.status
ORDER BY CASE s.status
    WHEN 'RECEIVED' THEN 1
    WHEN 'UNDER_INSPECTION' THEN 2
    WHEN 'EVALUATED' THEN 3
    WHEN 'DECIDED' THEN 4
    WHEN 'COMPLETED' THEN 5
    WHEN 'CANCELLED' THEN 6
END;

/* Sample Output (Warehouse 1: WH-DEL-01):
 status           | count
------------------+-------
 RECEIVED         |     0
 UNDER_INSPECTION |     0
 EVALUATED        |     1
 DECIDED          |     0
 COMPLETED        |     3
 CANCELLED        |     0
(6 rows)
*/


-- ============================================================================
-- 2. Decisions by Final Disposition
-- Business Purpose: Tally of finalized disposition pathways across all decided
-- returns. Ensures all six dispositions are returned (defaulting to 0).
-- ============================================================================

-- 2A. All Warehouses
SELECT
    d.disposition,
    COALESCE(COUNT(dd.decision_id), 0)::int AS count
FROM (
    VALUES 
        ('Resell'), 
        ('Refurbish'), 
        ('Exchange'), 
        ('Donate'), 
        ('Recycle'), 
        ('Write-off')
) AS d(disposition)
LEFT JOIN disposition_decisions dd ON dd.final_disposition = d.disposition
LEFT JOIN returns r ON dd.return_id = r.return_id
GROUP BY d.disposition
ORDER BY CASE d.disposition
    WHEN 'Resell' THEN 1
    WHEN 'Refurbish' THEN 2
    WHEN 'Exchange' THEN 3
    WHEN 'Donate' THEN 4
    WHEN 'Recycle' THEN 5
    WHEN 'Write-off' THEN 6
END;

/* Sample Output (All Warehouses):
 disposition | count
-------------+-------
 Resell      |     1
 Refurbish   |     4
 Exchange    |     1
 Donate      |     1
 Recycle     |     1
 Write-off   |     1
(6 rows)
*/

-- 2B. Filtered by Warehouse (Parameterized: :warehouse_id or $1 = 1)
SELECT
    d.disposition,
    COALESCE(COUNT(dd.decision_id), 0)::int AS count
FROM (
    VALUES 
        ('Resell'), 
        ('Refurbish'), 
        ('Exchange'), 
        ('Donate'), 
        ('Recycle'), 
        ('Write-off')
) AS d(disposition)
LEFT JOIN (
    disposition_decisions dd
    JOIN returns r ON dd.return_id = r.return_id AND r.warehouse_id = 1
) ON dd.final_disposition = d.disposition
GROUP BY d.disposition
ORDER BY CASE d.disposition
    WHEN 'Resell' THEN 1
    WHEN 'Refurbish' THEN 2
    WHEN 'Exchange' THEN 3
    WHEN 'Donate' THEN 4
    WHEN 'Recycle' THEN 5
    WHEN 'Write-off' THEN 6
END;

/* Sample Output (Warehouse 1: WH-DEL-01):
 disposition | count
-------------+-------
 Resell      |     0
 Refurbish   |     2
 Exchange    |     0
 Donate      |     0
 Recycle     |     1
 Write-off   |     0
(6 rows)
*/


-- ============================================================================
-- 3. Override Rate
-- Business Purpose: Measures supervisor divergence from AI recommendations.
-- Formula: decisions with is_override = true ÷ total decisions (0 when none).
-- ============================================================================

-- 3A. All Warehouses
SELECT
    COUNT(*)::int AS total_decisions,
    COUNT(*) FILTER (WHERE dd.is_override = true)::int AS override_count,
    ROUND(
        COALESCE(
            COUNT(*) FILTER (WHERE dd.is_override = true)::numeric / NULLIF(COUNT(*), 0),
            0
        ),
        3
    )::numeric(5, 3) AS override_rate
FROM disposition_decisions dd
JOIN returns r ON dd.return_id = r.return_id;

/* Sample Output (All Warehouses):
 total_decisions | override_count | override_rate
-----------------+----------------+---------------
               9 |              2 |         0.222
(1 row)
*/

-- 3B. Filtered by Warehouse (Parameterized: :warehouse_id or $1 = 1)
SELECT
    COUNT(*)::int AS total_decisions,
    COUNT(*) FILTER (WHERE dd.is_override = true)::int AS override_count,
    ROUND(
        COALESCE(
            COUNT(*) FILTER (WHERE dd.is_override = true)::numeric / NULLIF(COUNT(*), 0),
            0
        ),
        3
    )::numeric(5, 3) AS override_rate
FROM disposition_decisions dd
JOIN returns r ON dd.return_id = r.return_id
WHERE r.warehouse_id = 1;

/* Sample Output (Warehouse 1: WH-DEL-01):
 total_decisions | override_count | override_rate
-----------------+----------------+---------------
               3 |              1 |         0.333
(1 row)
*/


-- ============================================================================
-- 4. Total Expected Recovery
-- Business Purpose: Sum of net_expected_recovery of the final disposition's
-- alternative, across all decided returns.
-- ============================================================================

-- 4A. All Warehouses
SELECT
    COALESCE(SUM(da.net_expected_recovery), 0.00)::numeric(12, 2) AS total_expected_recovery
FROM disposition_decisions dd
JOIN returns r ON dd.return_id = r.return_id
JOIN decision_alternatives da
    ON dd.decision_id = da.decision_id
   AND da.disposition_type = dd.final_disposition;

/* Sample Output (All Warehouses):
 total_expected_recovery
-------------------------
               270950.00
(1 row)
*/

-- 4B. Filtered by Warehouse (Parameterized: :warehouse_id or $1 = 1)
SELECT
    COALESCE(SUM(da.net_expected_recovery), 0.00)::numeric(12, 2) AS total_expected_recovery
FROM disposition_decisions dd
JOIN returns r ON dd.return_id = r.return_id
JOIN decision_alternatives da
    ON dd.decision_id = da.decision_id
   AND da.disposition_type = dd.final_disposition
WHERE r.warehouse_id = 1;

/* Sample Output (Warehouse 1: WH-DEL-01):
 total_expected_recovery
-------------------------
                98250.00
(1 row)
*/


-- ============================================================================
-- 5. Total Actual Recovery
-- Business Purpose: Sum of actual_net_recovery realized from physical execution
-- recorded in decision_outcomes.
-- ============================================================================

-- 5A. All Warehouses
SELECT
    COALESCE(SUM(o.actual_net_recovery), 0.00)::numeric(12, 2) AS total_actual_recovery
FROM decision_outcomes o
JOIN disposition_decisions dd ON o.decision_id = dd.decision_id
JOIN returns r ON dd.return_id = r.return_id;

/* Sample Output (All Warehouses):
 total_actual_recovery
-----------------------
             165950.00
(1 row)
*/

-- 5B. Filtered by Warehouse (Parameterized: :warehouse_id or $1 = 1)
SELECT
    COALESCE(SUM(o.actual_net_recovery), 0.00)::numeric(12, 2) AS total_actual_recovery
FROM decision_outcomes o
JOIN disposition_decisions dd ON o.decision_id = dd.decision_id
JOIN returns r ON dd.return_id = r.return_id
WHERE r.warehouse_id = 1;

/* Sample Output (Warehouse 1: WH-DEL-01):
 total_actual_recovery
-----------------------
              96500.00
(1 row)
*/


-- ============================================================================
-- 6. Five Most Recent Returns
-- Business Purpose: Chronological intake activity stream for executive monitoring.
-- Matches GET /returns payload schema (joins products and warehouses).
-- ============================================================================

-- 6A. All Warehouses
SELECT
    r.return_id,
    r.return_tracking_number,
    r.product_id,
    p.sku,
    p.brand,
    p.model_name,
    p.category,
    p.retail_price,
    r.warehouse_id,
    w.warehouse_code,
    w.facility_name,
    r.serial_number,
    r.return_reason,
    to_char(r.return_date, 'YYYY-MM-DD') AS return_date,
    r.status,
    r.customer_comment,
    r.created_at
FROM returns r
JOIN products p ON r.product_id = p.product_id
JOIN warehouses w ON r.warehouse_id = w.warehouse_id
ORDER BY r.created_at DESC
LIMIT 5;

/* Sample Output (All Warehouses):
 return_id | return_tracking_number | product_id |       sku            | brand  |                   model_name                     |  category  | retail_price | warehouse_id | warehouse_code |            facility_name             |    return_date |   status
-----------+------------------------+------------+----------------------+--------+--------------------------------------------------+------------+--------------+--------------+----------------+--------------------------------------+----------------+------------
         7 | RET-2026-0007          |          7 | SKU-APPL-MBA-M2      | Apple  | MacBook Air M2 (8GB RAM / 256GB SSD, Space Grey) | Laptop     |     99900.00 |            1 | WH-DEL-01      | North Regional Reverse Logistics Hub | 2026-11-07     | COMPLETED
         3 | RET-2026-0003          |          3 | SKU-GOOG-PIX8-128    | Google | Pixel 8 (128GB, Hazel)                           | Smartphone |     75999.00 |            1 | WH-DEL-01      | North Regional Reverse Logistics Hub | 2026-11-03     | COMPLETED
         1 | RET-2026-0001          |          1 | SKU-APPL-IPH14-128   | Apple  | iPhone 14 (128GB, Midnight)                      | Smartphone |     69900.00 |            1 | WH-DEL-01      | North Regional Reverse Logistics Hub | 2026-11-01     | COMPLETED
         5 | RET-2026-0005          |          5 | SKU-SONY-WHXM5-BLK   | Sony   | WH-1000XM5 Wireless Noise-Cancelling Headphones  | Audio      |     29990.00 |            2 | WH-BLR-01      | South Intake & Diagnostic Center     | 2026-11-05     | DECIDED
        10 | RET-2026-0010          |          9 | SKU-DELL-XPS13-512   | Dell   | XPS 13 Plus 9320 (16GB RAM / 512GB SSD)          | Laptop     |    119900.00 |            1 | WH-DEL-01      | North Regional Reverse Logistics Hub | 2026-11-10     | EVALUATED
(5 rows)
*/

-- 6B. Filtered by Warehouse (Parameterized: :warehouse_id or $1 = 1)
SELECT
    r.return_id,
    r.return_tracking_number,
    r.product_id,
    p.sku,
    p.brand,
    p.model_name,
    p.category,
    p.retail_price,
    r.warehouse_id,
    w.warehouse_code,
    w.facility_name,
    r.serial_number,
    r.return_reason,
    to_char(r.return_date, 'YYYY-MM-DD') AS return_date,
    r.status,
    r.customer_comment,
    r.created_at
FROM returns r
JOIN products p ON r.product_id = p.product_id
JOIN warehouses w ON r.warehouse_id = w.warehouse_id
WHERE r.warehouse_id = 1
ORDER BY r.created_at DESC
LIMIT 5;

/* Sample Output (Warehouse 1: WH-DEL-01):
 return_id | return_tracking_number | product_id |       sku            | brand  |                   model_name                     |  category  | retail_price | warehouse_id | warehouse_code |            facility_name             |    return_date |   status
-----------+------------------------+------------+----------------------+--------+--------------------------------------------------+------------+--------------+--------------+----------------+--------------------------------------+----------------+------------
         7 | RET-2026-0007          |          7 | SKU-APPL-MBA-M2      | Apple  | MacBook Air M2 (8GB RAM / 256GB SSD, Space Grey) | Laptop     |     99900.00 |            1 | WH-DEL-01      | North Regional Reverse Logistics Hub | 2026-11-07     | COMPLETED
         3 | RET-2026-0003          |          3 | SKU-GOOG-PIX8-128    | Google | Pixel 8 (128GB, Hazel)                           | Smartphone |     75999.00 |            1 | WH-DEL-01      | North Regional Reverse Logistics Hub | 2026-11-03     | COMPLETED
         1 | RET-2026-0001          |          1 | SKU-APPL-IPH14-128   | Apple  | iPhone 14 (128GB, Midnight)                      | Smartphone |     69900.00 |            1 | WH-DEL-01      | North Regional Reverse Logistics Hub | 2026-11-01     | COMPLETED
        10 | RET-2026-0010          |          9 | SKU-DELL-XPS13-512   | Dell   | XPS 13 Plus 9320 (16GB RAM / 512GB SSD)          | Laptop     |    119900.00 |            1 | WH-DEL-01      | North Regional Reverse Logistics Hub | 2026-11-10     | EVALUATED
(4 rows)
*/
