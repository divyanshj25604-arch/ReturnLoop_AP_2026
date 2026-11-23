-- Query D.2: Change 'RET-2026-0013' to 'RET-2026-0015'
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

-- Query D.3: Change 'RET-2026-0013' to 'RET-2026-0015'
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

-- Query D.4: Change 'RET-2026-0013' to 'RET-2026-0015'
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

-- Query E.1: Change 'RET-2026-0013' to 'RET-2026-0015'
UPDATE returns
SET status = 'DECIDED'
WHERE return_tracking_number = 'RET-2026-0015'
RETURNING return_id, return_tracking_number, status;
