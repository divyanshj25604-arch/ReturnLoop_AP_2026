-- ============================================================================
-- Return Loop — Representative Database Seed Data
-- Project: Return Loop (Decision Intelligence Platform for Returned Electronics)
-- Role: Database Architect (Shreyansh Rathaur)
-- Assignment: AP CP1
-- Target Engine: PostgreSQL (v12+)
--
-- NOTE / DISCLAIMER:
-- All financial, product, serial number, and operational data contained herein
-- are purely representative, illustrative sample data created for testing,
-- demonstration, normalization verification, and query benchmarking. They do
-- not represent confidential, proprietary, or real-world customer or vendor data.
-- ============================================================================

-- Clean existing data in reverse dependency order
TRUNCATE TABLE decision_outcomes CASCADE;
TRUNCATE TABLE decision_alternatives CASCADE;
TRUNCATE TABLE disposition_decisions CASCADE;
TRUNCATE TABLE inspections CASCADE;
TRUNCATE TABLE returns CASCADE;
TRUNCATE TABLE operators CASCADE;
TRUNCATE TABLE warehouses CASCADE;
TRUNCATE TABLE products CASCADE;

-- Reset primary key sequences for clean testing IDs
ALTER SEQUENCE products_product_id_seq RESTART WITH 1;
ALTER SEQUENCE warehouses_warehouse_id_seq RESTART WITH 1;
ALTER SEQUENCE operators_operator_id_seq RESTART WITH 1;
ALTER SEQUENCE returns_return_id_seq RESTART WITH 1;
ALTER SEQUENCE inspections_inspection_id_seq RESTART WITH 1;
ALTER SEQUENCE disposition_decisions_decision_id_seq RESTART WITH 1;
ALTER SEQUENCE decision_alternatives_alternative_id_seq RESTART WITH 1;
ALTER SEQUENCE decision_outcomes_outcome_id_seq RESTART WITH 1;

-- ----------------------------------------------------------------------------
-- 1. Seed: products
-- Catalog of electronic devices with retail prices in Indian Rupees (INR).
-- ----------------------------------------------------------------------------
INSERT INTO products (sku, brand, model_name, category, retail_price) VALUES
('SKU-APPL-IPH14-128', 'Apple',    'iPhone 14 (128GB, Midnight)',                      'Smartphone',      69900.00),
('SKU-SAMS-GS23-256',  'Samsung',  'Galaxy S23 5G (256GB, Phantom Black)',             'Smartphone',      74999.00),
('SKU-GOOG-PIX8-128',  'Google',   'Pixel 8 (128GB, Hazel)',                           'Smartphone',      75999.00),
('SKU-APPL-APP2-WHT',  'Apple',    'AirPods Pro 2nd Gen (USB-C MagSafe)',              'Audio',           24900.00),
('SKU-SONY-WHXM5-BLK', 'Sony',     'WH-1000XM5 Wireless Noise-Cancelling Headphones', 'Audio',           29990.00),
('SKU-JBL-CHG5-BLU',   'JBL',      'Charge 5 Portable Waterproof Bluetooth Speaker',   'Audio',           15999.00),
('SKU-APPL-MBA-M2',    'Apple',    'MacBook Air M2 (8GB RAM / 256GB SSD, Space Grey)', 'Laptop',          99900.00),
('SKU-NINT-SWOLED-WHT','Nintendo', 'Switch OLED Model (White Joy-Con)',               'Gaming Console',  34999.00),
('SKU-DELL-XPS13-512', 'Dell',     'XPS 13 Plus 9320 (16GB RAM / 512GB SSD)',          'Laptop',         119900.00),
('SKU-ONEP-12-256',    'OnePlus',  '12 5G (16GB RAM / 256GB, Flowy Emerald)',          'Smartphone',      64999.00);

-- ----------------------------------------------------------------------------
-- 2. Seed: warehouses
-- Regional reverse-logistics intake centers across India.
-- ----------------------------------------------------------------------------
INSERT INTO warehouses (warehouse_code, facility_name, city, state, capacity) VALUES
('WH-DEL-01', 'North Regional Reverse Logistics Hub',  'Gurugram',    'Haryana',     50000),
('WH-BLR-01', 'South Intake & Diagnostic Center',       'Bengaluru',   'Karnataka',   45000),
('WH-MUM-01', 'West Reverse Fulfillment Center',        'Bhiwandi',    'Maharashtra', 60000),
('WH-HYD-01', 'Deccan Electronics Returns Facility',   'Hyderabad',   'Telangana',   35000);

-- ----------------------------------------------------------------------------
-- 3. Seed: operators
-- Reverse-logistics technicians, inspectors, and triage decision managers.
-- ----------------------------------------------------------------------------
INSERT INTO operators (employee_code, full_name, email, role, warehouse_id, is_active) VALUES
('OP-101', 'Rajesh Sharma',    'rajesh.sharma@returnloop.internal',    'Senior Triage Supervisor',       1, TRUE),
('OP-102', 'Priya Sundaram',   'priya.sundaram@returnloop.internal',   'Lead Diagnostics Specialist',    2, TRUE),
('OP-103', 'Amit Kulkarni',    'amit.kulkarni@returnloop.internal',    'Reverse Logistics Technician',   3, TRUE),
('OP-104', 'Sneha Reddy',      'sneha.reddy@returnloop.internal',      'Quality & Disposition Assessor', 4, TRUE),
('OP-105', 'Vikram Verma',     'vikram.verma@returnloop.internal',     'Mobile Diagnostics Specialist',  1, TRUE);

-- ----------------------------------------------------------------------------
-- 4. Seed: returns
-- Representative customer return transactions with varied reasons and conditions.
-- ----------------------------------------------------------------------------
INSERT INTO returns (return_tracking_number, product_id, warehouse_id, serial_number, return_reason, return_date, status, customer_comment) VALUES
('RET-2026-0001', 1, 1, 'IMEI-354928104829101', 'Changed mind / unwanted gift',        '2026-11-01', 'COMPLETED',        'Box seal opened by recipient but phone never activated.'),
('RET-2026-0002', 2, 2, 'IMEI-358172901827402', 'Cosmetic hairline scratch on back',   '2026-11-02', 'COMPLETED',        'Hairline scratch near camera module out of the box.'),
('RET-2026-0003', 3, 1, 'IMEI-359182049182703', 'Defective display touch sensor',      '2026-11-03', 'COMPLETED',        'Touch responsiveness lags along bottom navigation area.'),
('RET-2026-0004', 4, 3, 'SN-H8J7K6L5M401',      'Hygiene return / ear canal fit',      '2026-11-04', 'COMPLETED',        'Customer experienced discomfort with medium silicone tips.'),
('RET-2026-0005', 5, 2, 'SN-S01-9283741829',    'ANC distortion in left ear cup',      '2026-11-05', 'DECIDED',          'Static noise heard when active noise cancellation engaged.'),
('RET-2026-0006', 6, 4, 'SN-JBL-8472910293',    'Charging port loose / no power',      '2026-11-06', 'COMPLETED',        'Device fails to negotiate power over USB-C connector.'),
('RET-2026-0007', 7, 1, 'SN-C02G8192MD6R',      'Severe liquid spill damage',          '2026-11-07', 'COMPLETED',        'Spilled coffee on keyboard; machine will not boot.'),
('RET-2026-0008', 8, 3, 'SN-XKW10082718293',    'Analog stick drift and joy-con wear', '2026-11-08', 'DECIDED',          'Left analog stick inputs drift upward during gameplay.'),
('RET-2026-0009', 1, 2, 'IMEI-354928104829999', 'Wrong color variant delivered',       '2026-11-09', 'DECIDED',          'Ordered Starlight variant but received Midnight.'),
('RET-2026-0010', 9, 1, 'SN-DELL-9182736450',    'Intermittent haptic trackpad lock',   '2026-11-10', 'DECIDED',          'Seamless glass trackpad clicks erratically after sleep.'),
('RET-2026-0011', 10,4, 'IMEI-867192049182710', 'Continuous bootloop upon update',     '2026-11-11', 'UNDER_INSPECTION', 'System reboots continuously at OxygenOS animation.'),
('RET-2026-0012', 4, 3, 'SN-H8J7K6L99988',      'Missing left earbud from package',    '2026-11-12', 'RECEIVED',         'Customer package returned with missing left earpiece.');

-- ----------------------------------------------------------------------------
-- 5. Seed: inspections
-- Diagnostic evaluations covering Excellent, Good, Fair, and Damaged conditions.
-- ----------------------------------------------------------------------------
INSERT INTO inspections (return_id, inspector_id, condition_grade, has_original_packaging, has_all_accessories, functional_status, repair_estimate, diagnostic_notes) VALUES
(1,  1, 'Excellent', TRUE,  TRUE,  'Fully Functional',     0.00, 'Zero cosmetic scratches. 100% battery health. Factory packaging pristine.'),
(2,  2, 'Good',      TRUE,  TRUE,  'Fully Functional',  1500.00, 'Minor micro-abrasion on back Gorilla Glass. All radios, display, and cameras 100% pass.'),
(3,  5, 'Fair',      TRUE,  TRUE,  'Defective Hardware',8500.00, 'Digitizer touch failure in lower 15% grid. Requires OLED screen assembly replacement.'),
(4,  3, 'Good',      TRUE,  TRUE,  'Fully Functional',   500.00, 'Cosmetics flawless. Silicone ear tips discarded and acoustic mesh UV-sanitized.'),
(5,  2, 'Fair',      TRUE,  TRUE,  'Minor Glitch',      4200.00, 'Left internal ANC feedback mic shows high impedance. Requires headband wire harness service.'),
(6,  4, 'Damaged',   TRUE,  FALSE, 'Defective Hardware',2800.00, 'USB-C daughterboard connector pin sheared off. Outer fabric clean.'),
(7,  1, 'Damaged',   FALSE, FALSE, 'Non-functional',   62000.00, 'Corrosion across logic board power rails. CPU shorted. Total liquid ingress.'),
(8,  3, 'Fair',      TRUE,  TRUE,  'Defective Hardware',3200.00, 'Joy-con potentiometer drift confirmed on calibration rig. Screen minor scuffs.'),
(9,  2, 'Excellent', TRUE,  TRUE,  'Fully Functional',     0.00, 'Factory screen film untouched. Zero cycle count. Brand new unit in opened box.'),
(10, 5, 'Good',      TRUE,  TRUE,  'Minor Glitch',      6000.00, 'Trackpad haptic actuator needs firmware re-flash and cable seated correctly.');

-- ----------------------------------------------------------------------------
-- 6. Seed: disposition_decisions
-- Disposition recommendations and final decisions (with both accepted and overridden recommendations).
-- Represents all 6 dispositions: Resell, Refurbish, Exchange, Donate, Recycle, Write-off.
-- ----------------------------------------------------------------------------
INSERT INTO disposition_decisions (return_id, recommended_disposition, final_disposition, decided_by_operator_id, is_override, override_reason, confidence_score) VALUES
(1,  'Resell',    'Resell',    1, FALSE, NULL,                                                                                                           0.985),
(2,  'Resell',    'Refurbish', 2, TRUE,  'Supervisor override: Buffing rear glass and certifying as Grade-A refurbished maximizes resale price realization.', 0.860),
(3,  'Refurbish', 'Refurbish', 5, FALSE, NULL,                                                                                                           0.930),
(4,  'Resell',    'Donate',    3, TRUE,  'Corporate health & hygiene policy prohibits open-box earphone resale. Approved for educational trust donation.', 0.890),
(5,  'Refurbish', 'Refurbish', 2, FALSE, NULL,                                                                                                           0.875),
(6,  'Recycle',   'Recycle',   4, FALSE, NULL,                                                                                                           0.945),
(7,  'Write-off', 'Write-off', 1, FALSE, NULL,                                                                                                           0.995),
(8,  'Refurbish', 'Refurbish', 3, FALSE, NULL,                                                                                                           0.885),
(9,  'Exchange',  'Exchange',  2, FALSE, NULL,                                                                                                           0.965),
(10, 'Refurbish', 'Refurbish', 5, FALSE, NULL,                                                                                                           0.840);

-- ----------------------------------------------------------------------------
-- 7. Seed: decision_alternatives
-- Multi-criteria alternatives evaluated by the recommendation algorithm.
-- ----------------------------------------------------------------------------
INSERT INTO decision_alternatives (decision_id, disposition_type, estimated_revenue, estimated_cost, feasibility_score, rank_order, is_recommended, rationale) VALUES
-- Alternatives for Decision 1 (iPhone 14 - Excellent condition)
(1, 'Resell',    62000.00, 1200.00, 0.985, 1, TRUE,  'Pristine condition allows direct secondary open-box sale with 88% retail value recovery.'),
(1, 'Refurbish', 59000.00, 3500.00, 0.820, 2, FALSE, 'Refurbishment unnecessary; incurs redundant labor and handling costs.'),
(1, 'Exchange',  56000.00, 2000.00, 0.750, 3, FALSE, 'Device could fulfill warranty pool, but direct liquid resale provides superior recovery.'),

-- Alternatives for Decision 2 (Galaxy S23 - Minor scratch)
(2, 'Resell',    61000.00, 1500.00, 0.810, 1, TRUE,  'Algorithm prioritized immediate sale as Grade-B open-box.'),
(2, 'Refurbish', 64500.00, 4200.00, 0.940, 2, FALSE, 'Polishing rear glass elevates unit to Grade-A certified refurbished; net margin is higher.'),
(2, 'Donate',        0.00,  500.00, 0.900, 3, FALSE, 'High residual economic value precludes charitable donation.'),

-- Alternatives for Decision 3 (Pixel 8 - Screen digitizer defect)
(3, 'Refurbish', 54000.00, 9500.00, 0.930, 1, TRUE,  'OLED screen replacement recovers over 58% of device MSRP after service.'),
(3, 'Resell',    25000.00,  800.00, 0.350, 2, FALSE, 'Selling with defective display yields steep wholesale salvage discount.'),
(3, 'Write-off',     0.00, 1000.00, 0.990, 3, FALSE, 'Salvage recovery far exceeds write-off threshold.'),

-- Alternatives for Decision 4 (AirPods Pro - Hygiene intake)
(4, 'Resell',    19000.00, 1000.00, 0.450, 1, TRUE,  'Algorithmic open-box resale flagged due to sanitization constraints.'),
(4, 'Donate',        0.00,  350.00, 0.950, 2, FALSE, 'Sanitized audio unit suitable for community education initiative.'),
(4, 'Recycle',     400.00,  300.00, 0.880, 3, FALSE, 'Material scrap yields negligible economic return.'),

-- Alternatives for Decision 5 (Sony WH-1000XM5 - ANC glitch)
(5, 'Refurbish', 23000.00, 4800.00, 0.875, 1, TRUE,  'Left feedback harness replacement restores full premium ANC capability.'),
(5, 'Resell',    13000.00,  900.00, 0.400, 2, FALSE, 'Selling with audio distortion causes customer friction and return churn.'),
(5, 'Recycle',     800.00,  500.00, 0.910, 3, FALSE, 'High residual electronics value makes recycling suboptimal.'),

-- Alternatives for Decision 6 (JBL Charge 5 - Damaged USB port)
(6, 'Recycle',    1200.00,  400.00, 0.945, 1, TRUE,  'Heavy repair labor exceeds recovery value; certified e-waste recovery recommended.'),
(6, 'Refurbish',  7500.00, 6800.00, 0.480, 2, FALSE, 'Board-level micro-soldering cost erodes net recovery margin to under INR 700.'),
(6, 'Write-off',     0.00,  300.00, 0.990, 3, FALSE, 'Recycling delivers higher recovery than pure loss write-off.'),

-- Alternatives for Decision 7 (MacBook Air M2 - Liquid damage total loss)
(7, 'Write-off',     0.00, 1500.00, 0.995, 1, TRUE,  'Catastrophic liquid ingress shorted CPU and NAND; repair cost exceeds market value.'),
(7, 'Recycle',    3500.00, 5500.00, 0.720, 2, FALSE, 'Chassis aluminum salvage does not offset hazardous battery processing fee.'),
(7, 'Refurbish', 45000.00,68000.00, 0.150, 3, FALSE, 'Board and display replacement cost exceeds replacement device cost.'),

-- Alternatives for Decision 8 (Nintendo Switch OLED - Joy-Con drift)
(8, 'Refurbish', 27000.00, 3800.00, 0.885, 1, TRUE,  'Hall-effect joystick replacement permanently resolves drift for quick re-commerce.'),
(8, 'Resell',    19000.00, 1000.00, 0.520, 2, FALSE, 'Drifting joystick impairs gaming experience and violates return warranty standards.'),

-- Alternatives for Decision 9 (iPhone 14 - Wrong color / pristine)
(9, 'Exchange',  66000.00, 1000.00, 0.965, 1, TRUE,  'Unblemished device directly repopulates customer warranty replacement pool.'),
(9, 'Resell',    63000.00, 1200.00, 0.920, 2, FALSE, 'Direct open-box sale is viable but replacement inventory pool has higher priority.'),

-- Alternatives for Decision 10 (Dell XPS 13 - Trackpad glitch)
(10,'Refurbish', 88000.00, 7500.00, 0.840, 1, TRUE,  'Haptic trackpad sub-assembly replacement restores workstation to Grade-A status.'),
(10,'Write-off',     0.00, 2000.00, 0.950, 2, FALSE, 'Asset value of INR 88,000 makes write-off financially irresponsible.');

-- ----------------------------------------------------------------------------
-- 8. Seed: decision_outcomes
-- Actual financial recovery and fulfillment metrics for completed dispositions.
-- ----------------------------------------------------------------------------
INSERT INTO decision_outcomes (decision_id, disposition_executed, actual_revenue, actual_cost, execution_partner, completion_date, outcome_notes) VALUES
(1, 'Resell',    62500.00, 1150.00, 'Amazon Renewed India',              '2026-11-04', 'Sold within 48 hours of open-box listing. Excellent margin realization.'),
(2, 'Refurbish', 64800.00, 3950.00, 'Cashify Refurbished Hub',           '2026-11-06', 'Polished rear glass and recertified as Grade-A. Surpassed revenue projection.'),
(3, 'Refurbish', 53200.00, 8900.00, 'Flipkart 2GUD Electronics',         '2026-11-08', 'OEM OLED panel replaced. Successfully delivered to secondary buyer.'),
(4, 'Donate',        0.00,  320.00, 'Goonj Youth Education Trust',       '2026-11-07', 'Sanitized and delivered to vocational training lab in rural Karnataka.'),
(6, 'Recycle',    1350.00,  380.00, 'Attero Recycling Ltd',              '2026-11-10', 'Decommissioned under Green Electronics Council certified recycling audit.'),
(7, 'Write-off',     0.00, 1200.00, 'Internal Reverse Logistics Vault',  '2026-11-11', 'Scrap parts culled for non-critical testing fixtures; loss recorded.');
