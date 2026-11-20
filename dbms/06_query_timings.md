# Return Loop — Database Query Execution & Timing Analysis

**Project:** Return Loop (Reverse Logistics Decision Intelligence Platform)  
**Role:** Database Queries & Testing / ER Documentation (Devanshi Kumari)  
**Assignment:** AP CP1  
**Database Engine:** PostgreSQL 17.11 (Homebrew on macOS Darwin aarch64)  
**Source Artifacts:** `dbms/03_schema.sql`, `dbms/04_seed.sql`, `dbms/05_queries.sql`  

---

## 1. Test Environment & Verification Summary

All SQL queries defined in `dbms/05_queries.sql` were executed against a live, dedicated PostgreSQL instance (`returnloop_db`). The test suite systematically verified schema constraints, referential integrity, join semantics, grouping aggregations, and transactional DML operations.

### Executive Test Metrics
| Metric | Value | Status |
|---|---|---|
| **Database Engine** | PostgreSQL 17.11 | PASS |
| **Number of Tables Tested** | 8 | PASS |
| **Total Seed Rows Loaded** | 84 | PASS |
| **Total Queries Implemented** | 26 | PASS |
| **Successful Queries** | 26 | PASS |
| **Failed Queries** | 0 | NONE |
| **Execution Pass Rate** | **100.0%** | PASS |
| **Average Query Execution Time** | **1.78 ms** | OPTIMAL |

### Tables & Seed Data Verified
| # | Table Name | Purpose in Return Loop Pipeline | Seed Row Count | Primary Key | Foreign Key References |
|---|---|---|---|---|---|
| 1 | `products` | Master electronics catalog specifications | 10 | `product_id` | None (Master) |
| 2 | `warehouses` | Regional reverse fulfillment intake hubs | 4 | `warehouse_id` | None (Master) |
| 3 | `operators` | Technicians and triage decision supervisors | 5 | `operator_id` | `warehouses` |
| 4 | `returns` | Intake transactions for returned products | 12 | `return_id` | `products`, `warehouses` |
| 5 | `inspections` | Technical condition & diagnostic grading | 10 | `inspection_id` | `returns`, `operators` |
| 6 | `disposition_decisions` | Algorithmic recommendations & authorizations | 10 | `decision_id` | `returns` (1:1), `operators` |
| 7 | `decision_alternatives` | Candidate disposition channels evaluated | 27 | `alternative_id` | `disposition_decisions` (1:N) |
| 8 | `decision_outcomes` | Executed financial and operational recovery | 6 | `outcome_id` | `disposition_decisions` (1:1) |

---

## 2. Comprehensive Query Timing Benchmarks

Each query was executed **three consecutive times** using native PostgreSQL timing (`\timing on`). Timings are reported in milliseconds (ms), with the arithmetic average calculated per query:

| Query ID & Description | Category | Run 1 (ms) | Run 2 (ms) | Run 3 (ms) | Average (ms) | Execution Status |
|---|---|---|---|---|---|---|
| `Q1 (A.1: All Returned Products)` | SELECT | 0.831 | 0.704 | 0.702 | **0.746** | PASS |
| `Q2 (A.2: Returns by Condition - Damaged)` | SELECT | 0.904 | 0.891 | 0.981 | **0.925** | PASS |
| `Q3 (A.3: Returns by Warehouse - WH-DEL-01)` | SELECT | 0.691 | 0.644 | 0.705 | **0.680** | PASS |
| `Q4 (A.4: Pending Disposition Decisions)` | SELECT | 2.298 | 2.915 | 2.400 | **2.538** | PASS |
| `Q5 (A.5: Completed Returns)` | SELECT | 2.881 | 2.984 | 2.686 | **2.850** | PASS |
| `Q6 (B.1: Join Returns with Products)` | JOIN | 1.700 | 1.443 | 1.519 | **1.554** | PASS |
| `Q7 (B.2: Join Returns with Inspections)` | JOIN | 1.602 | 1.889 | 2.210 | **1.900** | PASS |
| `Q8 (B.3: Join Returns with Warehouses)` | JOIN | 1.718 | 1.589 | 1.736 | **1.681** | PASS |
| `Q9 (B.4: Join Returns with Decisions)` | JOIN | 2.063 | 2.016 | 1.850 | **1.976** | PASS |
| `Q10 (B.5: Join Decisions with Alternatives)` | JOIN | 1.954 | 1.762 | 1.690 | **1.802** | PASS |
| `Q11 (B.6: Join Decisions with Outcomes)` | JOIN | 1.803 | 1.700 | 2.029 | **1.844** | PASS |
| `Q12 (C.1: Count Returns by Condition)` | AGGREGATION | 3.081 | 2.883 | 2.607 | **2.857** | PASS |
| `Q13 (C.2: Count Returns by Disposition)` | AGGREGATION | 2.179 | 2.293 | 1.923 | **2.132** | PASS |
| `Q14 (C.3: Average Recovery by Channel)` | AGGREGATION | 2.138 | 1.615 | 1.490 | **1.748** | PASS |
| `Q15 (C.4: Total Recovered Value by Partner)` | AGGREGATION | 1.369 | 1.479 | 1.259 | **1.369** | PASS |
| `Q16 (C.5: Average Decision Confidence)` | AGGREGATION | 1.749 | 1.656 | 1.583 | **1.663** | PASS |
| `Q17 (C.6: Returns Handled by Warehouse)` | AGGREGATION | 2.636 | 2.534 | 2.550 | **2.573** | PASS |
| `Q18 (D.1: Insert Product)` | INSERT | 1.126 | 0.925 | 0.874 | **0.975** | PASS |
| `Q19 (D.2: Register Return)` | INSERT | 1.854 | 1.409 | 2.005 | **1.756** | PASS |
| `Q20 (D.3: Record Inspection)` | INSERT | 1.856 | 1.990 | 1.675 | **1.840** | PASS |
| `Q21 (D.4: Insert Disposition Decision)` | INSERT | 1.957 | 1.940 | 3.009 | **2.302** | PASS |
| `Q22 (E.1: Update Return Status)` | UPDATE | 1.663 | 1.942 | 1.919 | **1.841** | PASS |
| `Q23 (E.2: Record Operator Override)` | UPDATE | 2.476 | 2.563 | 2.005 | **2.348** | PASS |
| `Q24 (E.3: Update Disposition Outcome)` | UPDATE | 1.418 | 1.323 | 1.742 | **1.494** | PASS |
| `Q25 (E.4: Record Actual Recovery)` | UPDATE | 1.373 | 1.350 | 1.609 | **1.444** | PASS |
| `Q26 (F.1: Controlled Alternative Deletion)` | DELETE | 1.646 | 1.410 | 1.504 | **1.520** | PASS |

---

## 3. Query Execution Outputs & Verification

Below are the actual query outputs recorded during the test execution run:

### 3.1 Q1 (A.1: All Returned Products)
```sql
return_id | return_tracking_number | product_id |         sku         |  brand   |                    model_name                    |    category    | return_date |      status      
-----------+------------------------+------------+---------------------+----------+--------------------------------------------------+----------------+-------------+------------------
         1 | RET-2026-0001          |          1 | SKU-APPL-IPH14-128  | Apple    | iPhone 14 (128GB, Midnight)                      | Smartphone     | 2026-11-01  | COMPLETED
         2 | RET-2026-0002          |          2 | SKU-SAMS-GS23-256   | Samsung  | Galaxy S23 5G (256GB, Phantom Black)             | Smartphone     | 2026-11-02  | COMPLETED
         3 | RET-2026-0003          |          3 | SKU-GOOG-PIX8-128   | Google   | Pixel 8 (128GB, Hazel)                           | Smartphone     | 2026-11-03  | COMPLETED
         4 | RET-2026-0004          |          4 | SKU-APPL-APP2-WHT   | Apple    | AirPods Pro 2nd Gen (USB-C MagSafe)              | Audio          | 2026-11-04  | COMPLETED
         5 | RET-2026-0005          |          5 | SKU-SONY-WHXM5-BLK  | Sony     | WH-1000XM5 Wireless Noise-Cancelling Headphones  | Audio          | 2026-11-05  | DECIDED
         6 | RET-2026-0006          |          6 | SKU-JBL-CHG5-BLU    | JBL      | Charge 5 Portable Waterproof Bluetooth Speaker   | Audio          | 2026-11-06  | COMPLETED
         7 | RET-2026-0007          |          7 | SKU-APPL-MBA-M2     | Apple    | MacBook Air M2 (8GB RAM / 256GB SSD, Space Grey) | Laptop         | 2026-11-07  | COMPLETED
         8 | RET-2026-0008          |          8 | SKU-NINT-SWOLED-WHT | Nintendo | Switch OLED Model (White Joy-Con)                | Gaming Console | 2026-11-08  | DECIDED
         9 | RET-2026-0009          |          1 | SKU-APPL-IPH14-128  | Apple    | iPhone 14 (128GB, Midnight)                      | Smartphone     | 2026-11-09  | DECIDED
        10 | RET-2026-0010          |          9 | SKU-DELL-XPS13-512  | Dell     | XPS 13 Plus 9320 (16GB RAM / 512GB SSD)          | Laptop         | 2026-11-10  | DECIDED
        11 | RET-2026-0011          |         10 | SKU-ONEP-12-256     | OnePlus  | 12 5G (16GB RAM / 256GB, Flowy Emerald)          | Smartphone     | 2026-11-11  | UNDER_INSPECTION
        12 | RET-2026-0012          |          4 | SKU-APPL-APP2-WHT   | Apple    | AirPods Pro 2nd Gen (USB-C MagSafe)              | Audio          | 2026-11-12  | RECEIVED
(12 rows)

Time: 0.831 ms
```
*Timing: Run 1 = 0.831 ms | Run 2 = 0.704 ms | Run 3 = 0.702 ms | Average = 0.746 ms*

### 3.2 Q2 (A.2: Returns by Condition - Damaged)
```sql
return_id | return_tracking_number |                    model_name                    | condition_grade | functional_status  | repair_estimate 
-----------+------------------------+--------------------------------------------------+-----------------+--------------------+-----------------
         7 | RET-2026-0007          | MacBook Air M2 (8GB RAM / 256GB SSD, Space Grey) | Damaged         | Non-functional     |        62000.00
         6 | RET-2026-0006          | Charge 5 Portable Waterproof Bluetooth Speaker   | Damaged         | Defective Hardware |         2800.00
(2 rows)

Time: 0.904 ms
```
*Timing: Run 1 = 0.904 ms | Run 2 = 0.891 ms | Run 3 = 0.981 ms | Average = 0.925 ms*

### 3.3 Q3 (A.3: Returns by Warehouse - WH-DEL-01)
```sql
return_id | return_tracking_number | warehouse_code |            facility_name             |   city   | return_date |  status   
-----------+------------------------+----------------+--------------------------------------+----------+-------------+-----------
        10 | RET-2026-0010          | WH-DEL-01      | North Regional Reverse Logistics Hub | Gurugram | 2026-11-10  | DECIDED
         7 | RET-2026-0007          | WH-DEL-01      | North Regional Reverse Logistics Hub | Gurugram | 2026-11-07  | COMPLETED
         3 | RET-2026-0003          | WH-DEL-01      | North Regional Reverse Logistics Hub | Gurugram | 2026-11-03  | COMPLETED
         1 | RET-2026-0001          | WH-DEL-01      | North Regional Reverse Logistics Hub | Gurugram | 2026-11-01  | COMPLETED
(4 rows)

Time: 0.691 ms
```
*Timing: Run 1 = 0.691 ms | Run 2 = 0.644 ms | Run 3 = 0.705 ms | Average = 0.680 ms*

### 3.4 Q4 (A.4: Pending Disposition Decisions)
```sql
return_id | return_tracking_number |               model_name                |      status      | return_date |          return_reason           
-----------+------------------------+-----------------------------------------+------------------+-------------+----------------------------------
        11 | RET-2026-0011          | 12 5G (16GB RAM / 256GB, Flowy Emerald) | UNDER_INSPECTION | 2026-11-11  | Continuous bootloop upon update
        12 | RET-2026-0012          | AirPods Pro 2nd Gen (USB-C MagSafe)     | RECEIVED         | 2026-11-12  | Missing left earbud from package
(2 rows)

Time: 2.298 ms
```
*Timing: Run 1 = 2.298 ms | Run 2 = 2.915 ms | Run 3 = 2.400 ms | Average = 2.538 ms*

### 3.5 Q5 (A.5: Completed Returns)
```sql
return_id | return_tracking_number |                    model_name                    |  status   | final_disposition | disposition_executed | actual_net_recovery | completion_date 
-----------+------------------------+--------------------------------------------------+-----------+-------------------+----------------------+---------------------+-----------------
         7 | RET-2026-0007          | MacBook Air M2 (8GB RAM / 256GB SSD, Space Grey) | COMPLETED | Write-off         | Write-off            |            -1200.00 | 2026-11-11
         6 | RET-2026-0006          | Charge 5 Portable Waterproof Bluetooth Speaker   | COMPLETED | Recycle           | Recycle              |              970.00 | 2026-11-10
         3 | RET-2026-0003          | Pixel 8 (128GB, Hazel)                           | COMPLETED | Refurbish         | Refurbish            |            44300.00 | 2026-11-08
         4 | RET-2026-0004          | AirPods Pro 2nd Gen (USB-C MagSafe)              | COMPLETED | Donate            | Donate               |             -320.00 | 2026-11-07
         2 | RET-2026-0002          | Galaxy S23 5G (256GB, Phantom Black)             | COMPLETED | Refurbish         | Refurbish            |            60850.00 | 2026-11-06
         1 | RET-2026-0001          | iPhone 14 (128GB, Midnight)                      | COMPLETED | Resell            | Resell               |            61350.00 | 2026-11-04
(6 rows)

Time: 2.881 ms
```
*Timing: Run 1 = 2.881 ms | Run 2 = 2.984 ms | Run 3 = 2.686 ms | Average = 2.850 ms*

### 3.6 Q6 (B.1: Join Returns with Products)
```sql
return_id | return_tracking_number |         sku         |  brand   |                    model_name                    |    category    | retail_price |            return_reason            
-----------+------------------------+---------------------+----------+--------------------------------------------------+----------------+--------------+-------------------------------------
         1 | RET-2026-0001          | SKU-APPL-IPH14-128  | Apple    | iPhone 14 (128GB, Midnight)                      | Smartphone     |     69900.00 | Changed mind / unwanted gift
         2 | RET-2026-0002          | SKU-SAMS-GS23-256   | Samsung  | Galaxy S23 5G (256GB, Phantom Black)             | Smartphone     |     74999.00 | Cosmetic hairline scratch on back
         3 | RET-2026-0003          | SKU-GOOG-PIX8-128   | Google   | Pixel 8 (128GB, Hazel)                           | Smartphone     |     75999.00 | Defective display touch sensor
         4 | RET-2026-0004          | SKU-APPL-APP2-WHT   | Apple    | AirPods Pro 2nd Gen (USB-C MagSafe)              | Audio          |     24900.00 | Hygiene return / ear canal fit
         5 | RET-2026-0005          | SKU-SONY-WHXM5-BLK  | Sony     | WH-1000XM5 Wireless Noise-Cancelling Headphones  | Audio          |     29990.00 | ANC distortion in left ear cup
         6 | RET-2026-0006          | SKU-JBL-CHG5-BLU    | JBL      | Charge 5 Portable Waterproof Bluetooth Speaker   | Audio          |     15999.00 | Charging port loose / no power
         7 | RET-2026-0007          | SKU-APPL-MBA-M2     | Apple    | MacBook Air M2 (8GB RAM / 256GB SSD, Space Grey) | Laptop         |     99900.00 | Severe liquid spill damage
         8 | RET-2026-0008          | SKU-NINT-SWOLED-WHT | Nintendo | Switch OLED Model (White Joy-Con)                | Gaming Console |     34999.00 | Analog stick drift and joy-con wear
         9 | RET-2026-0009          | SKU-APPL-IPH14-128  | Apple    | iPhone 14 (128GB, Midnight)                      | Smartphone     |     69900.00 | Wrong color variant delivered
        10 | RET-2026-0010          | SKU-DELL-XPS13-512  | Dell     | XPS 13 Plus 9320 (16GB RAM / 512GB SSD)          | Laptop         |    119900.00 | Intermittent haptic trackpad lock
        11 | RET-2026-0011          | SKU-ONEP-12-256     | OnePlus  | 12 5G (16GB RAM / 256GB, Flowy Emerald)          | Smartphone     |     64999.00 | Continuous bootloop upon update
        12 | RET-2026-0012          | SKU-APPL-APP2-WHT   | Apple    | AirPods Pro 2nd Gen (USB-C MagSafe)              | Audio          |     24900.00 | Missing left earbud from package
(12 rows)

Time: 1.700 ms
```
*Timing: Run 1 = 1.700 ms | Run 2 = 1.443 ms | Run 3 = 1.519 ms | Average = 1.554 ms*

### 3.7 Q7 (B.2: Join Returns with Inspections)
```sql
return_id | return_tracking_number | inspection_id | condition_grade | has_original_packaging | has_all_accessories | functional_status  | repair_estimate |           inspected_at           
-----------+------------------------+---------------+-----------------+------------------------+---------------------+--------------------+-----------------+----------------------------------
         1 | RET-2026-0001          |             1 | Excellent       | t                      | t                   | Fully Functional   |            0.00 | 2026-11-16 11:36:14.533068+05:30
         2 | RET-2026-0002          |             2 | Good            | t                      | t                   | Fully Functional   |         1500.00 | 2026-11-16 11:36:14.533068+05:30
         3 | RET-2026-0003          |             3 | Fair            | t                      | t                   | Defective Hardware |         8500.00 | 2026-11-16 11:36:14.533068+05:30
         4 | RET-2026-0004          |             4 | Good            | t                      | t                   | Fully Functional   |          500.00 | 2026-11-16 11:36:14.533068+05:30
         5 | RET-2026-0005          |             5 | Fair            | t                      | t                   | Minor Glitch       |         4200.00 | 2026-11-16 11:36:14.533068+05:30
         6 | RET-2026-0006          |             6 | Damaged         | t                      | f                   | Defective Hardware |         2800.00 | 2026-11-16 11:36:14.533068+05:30
         7 | RET-2026-0007          |             7 | Damaged         | f                      | f                   | Non-functional     |        62000.00 | 2026-11-16 11:36:14.533068+05:30
         8 | RET-2026-0008          |             8 | Fair            | t                      | t                   | Defective Hardware |         3200.00 | 2026-11-16 11:36:14.533068+05:30
         9 | RET-2026-0009          |             9 | Excellent       | t                      | t                   | Fully Functional   |            0.00 | 2026-11-16 11:36:14.533068+05:30
        10 | RET-2026-0010          |            10 | Good            | t                      | t                   | Minor Glitch       |         6000.00 | 2026-11-16 11:36:14.533068+05:30
(10 rows)

Time: 1.602 ms
```
*Timing: Run 1 = 1.602 ms | Run 2 = 1.889 ms | Run 3 = 2.210 ms | Average = 1.900 ms*

### 3.8 Q8 (B.3: Join Returns with Warehouses)
```sql
return_id | return_tracking_number | warehouse_id | warehouse_code |            facility_name             |   city    |    state    |      status      
-----------+------------------------+--------------+----------------+--------------------------------------+-----------+-------------+------------------
         1 | RET-2026-0001          |            1 | WH-DEL-01      | North Regional Reverse Logistics Hub | Gurugram  | Haryana     | COMPLETED
         2 | RET-2026-0002          |            2 | WH-BLR-01      | South Intake & Diagnostic Center     | Bengaluru | Karnataka   | COMPLETED
         3 | RET-2026-0003          |            1 | WH-DEL-01      | North Regional Reverse Logistics Hub | Gurugram  | Haryana     | COMPLETED
         4 | RET-2026-0004          |            3 | WH-MUM-01      | West Reverse Fulfillment Center      | Bhiwandi  | Maharashtra | COMPLETED
         5 | RET-2026-0005          |            2 | WH-BLR-01      | South Intake & Diagnostic Center     | Bengaluru | Karnataka   | DECIDED
         6 | RET-2026-0006          |            4 | WH-HYD-01      | Deccan Electronics Returns Facility  | Hyderabad | Telangana   | COMPLETED
         7 | RET-2026-0007          |            1 | WH-DEL-01      | North Regional Reverse Logistics Hub | Gurugram  | Haryana     | COMPLETED
         8 | RET-2026-0008          |            3 | WH-MUM-01      | West Reverse Fulfillment Center      | Bhiwandi  | Maharashtra | DECIDED
         9 | RET-2026-0009          |            2 | WH-BLR-01      | South Intake & Diagnostic Center     | Bengaluru | Karnataka   | DECIDED
        10 | RET-2026-0010          |            1 | WH-DEL-01      | North Regional Reverse Logistics Hub | Gurugram  | Haryana     | DECIDED
        11 | RET-2026-0011          |            4 | WH-HYD-01      | Deccan Electronics Returns Facility  | Hyderabad | Telangana   | UNDER_INSPECTION
        12 | RET-2026-0012          |            3 | WH-MUM-01      | West Reverse Fulfillment Center      | Bhiwandi  | Maharashtra | RECEIVED
(12 rows)

Time: 1.718 ms
```
*Timing: Run 1 = 1.718 ms | Run 2 = 1.589 ms | Run 3 = 1.736 ms | Average = 1.681 ms*

### 3.9 Q9 (B.4: Join Returns with Decisions)
```sql
return_id | return_tracking_number | decision_id | recommended_disposition | final_disposition | is_override |                                                  override_reason                                                  | confidence_score |           decided_at            
-----------+------------------------+-------------+-------------------------+-------------------+-------------+-------------------------------------------------------------------------------------------------------------------+------------------+---------------------------------
         1 | RET-2026-0001          |           1 | Resell                  | Resell            | f           |                                                                                                                   |            0.985 | 2026-11-16 11:36:14.53364+05:30
         2 | RET-2026-0002          |           2 | Resell                  | Refurbish         | t           | Supervisor override: Buffing rear glass and certifying as Grade-A refurbished maximizes resale price realization. |            0.860 | 2026-11-16 11:36:14.53364+05:30
         3 | RET-2026-0003          |           3 | Refurbish               | Refurbish         | f           |                                                                                                                   |            0.930 | 2026-11-16 11:36:14.53364+05:30
         4 | RET-2026-0004          |           4 | Resell                  | Donate            | t           | Corporate health & hygiene policy prohibits open-box earphone resale. Approved for educational trust donation.    |            0.890 | 2026-11-16 11:36:14.53364+05:30
         5 | RET-2026-0005          |           5 | Refurbish               | Refurbish         | f           |                                                                                                                   |            0.875 | 2026-11-16 11:36:14.53364+05:30
         6 | RET-2026-0006          |           6 | Recycle                 | Recycle           | f           |                                                                                                                   |            0.945 | 2026-11-16 11:36:14.53364+05:30
         7 | RET-2026-0007          |           7 | Write-off               | Write-off         | f           |                                                                                                                   |            0.995 | 2026-11-16 11:36:14.53364+05:30
         8 | RET-2026-0008          |           8 | Refurbish               | Refurbish         | f           |                                                                                                                   |            0.885 | 2026-11-16 11:36:14.53364+05:30
         9 | RET-2026-0009          |           9 | Exchange                | Exchange          | f           |                                                                                                                   |            0.965 | 2026-11-16 11:36:14.53364+05:30
        10 | RET-2026-0010          |          10 | Refurbish               | Refurbish         | f           |                                                                                                                   |            0.840 | 2026-11-16 11:36:14.53364+05:30
(10 rows)

Time: 2.063 ms
```
*Timing: Run 1 = 2.063 ms | Run 2 = 2.016 ms | Run 3 = 1.850 ms | Average = 1.976 ms*

### 3.10 Q10 (B.5: Join Decisions with Alternatives)
```sql
decision_id | return_id | final_disposition | alternative_id | disposition_type | estimated_revenue | estimated_cost | net_expected_recovery | feasibility_score | rank_order | is_recommended 
-------------+-----------+-------------------+----------------+------------------+-------------------+----------------+-----------------------+-------------------+------------+----------------
           1 |         1 | Resell            |              1 | Resell           |          62000.00 |        1200.00 |              60800.00 |             0.985 |          1 | t
           1 |         1 | Resell            |              2 | Refurbish        |          59000.00 |        3500.00 |              55500.00 |             0.820 |          2 | f
           1 |         1 | Resell            |              3 | Exchange         |          56000.00 |        2000.00 |              54000.00 |             0.750 |          3 | f
           2 |         2 | Refurbish         |              4 | Resell           |          61000.00 |        1500.00 |              59500.00 |             0.810 |          1 | t
           2 |         2 | Refurbish         |              5 | Refurbish        |          64500.00 |        4200.00 |              60300.00 |             0.940 |          2 | f
           2 |         2 | Refurbish         |              6 | Donate           |              0.00 |         500.00 |               -500.00 |             0.900 |          3 | f
           3 |         3 | Refurbish         |              7 | Refurbish        |          54000.00 |        9500.00 |              44500.00 |             0.930 |          1 | t
           3 |         3 | Refurbish         |              8 | Resell           |          25000.00 |         800.00 |              24200.00 |             0.350 |          2 | f
           3 |         3 | Refurbish         |              9 | Write-off        |              0.00 |        1000.00 |              -1000.00 |             0.990 |          3 | f
           4 |         4 | Donate            |             10 | Resell           |          19000.00 |        1000.00 |              18000.00 |             0.450 |          1 | t
           4 |         4 | Donate            |             11 | Donate           |              0.00 |         350.00 |               -350.00 |             0.950 |          2 | f
           4 |         4 | Donate            |             12 | Recycle          |            400.00 |         300.00 |                100.00 |             0.880 |          3 | f
           5 |         5 | Refurbish         |             13 | Refurbish        |          23000.00 |        4800.00 |              18200.00 |             0.875 |          1 | t
           5 |         5 | Refurbish         |             14 | Resell           |          13000.00 |         900.00 |              12100.00 |             0.400 |          2 | f
           5 |         5 | Refurbish         |             15 | Recycle          |            800.00 |         500.00 |                300.00 |             0.910 |          3 | f
           6 |         6 | Recycle           |             16 | Recycle          |           1200.00 |         400.00 |                800.00 |             0.945 |          1 | t
           6 |         6 | Recycle           |             17 | Refurbish        |           7500.00 |        6800.00 |                700.00 |             0.480 |          2 | f
           6 |         6 | Recycle           |             18 | Write-off        |              0.00 |         300.00 |               -300.00 |             0.990 |          3 | f
           7 |         7 | Write-off         |             19 | Write-off        |              0.00 |        1500.00 |              -1500.00 |             0.995 |          1 | t
           7 |         7 | Write-off         |             20 | Recycle          |           3500.00 |        5500.00 |              -2000.00 |             0.720 |          2 | f
           7 |         7 | Write-off         |             21 | Refurbish        |          45000.00 |       68000.00 |             -23000.00 |             0.150 |          3 | f
           8 |         8 | Refurbish         |             22 | Refurbish        |          27000.00 |        3800.00 |              23200.00 |             0.885 |          1 | t
           8 |         8 | Refurbish         |             23 | Resell           |          19000.00 |        1000.00 |              18000.00 |             0.520 |          2 | f
           9 |         9 | Exchange          |             24 | Exchange         |          66000.00 |        1000.00 |              65000.00 |             0.965 |          1 | t
           9 |         9 | Exchange          |             25 | Resell           |          63000.00 |        1200.00 |              61800.00 |             0.920 |          2 | f
          10 |        10 | Refurbish         |             26 | Refurbish        |          88000.00 |        7500.00 |              80500.00 |             0.840 |          1 | t
          10 |        10 | Refurbish         |             27 | Write-off        |              0.00 |        2000.00 |              -2000.00 |             0.950 |          2 | f
(27 rows)

Time: 1.954 ms
```
*Timing: Run 1 = 1.954 ms | Run 2 = 1.762 ms | Run 3 = 1.690 ms | Average = 1.802 ms*

### 3.11 Q11 (B.6: Join Decisions with Outcomes)
```sql
decision_id | return_id | final_disposition | outcome_id | disposition_executed | actual_revenue | actual_cost | actual_net_recovery |        execution_partner         | completion_date 
-------------+-----------+-------------------+------------+----------------------+----------------+-------------+---------------------+----------------------------------+-----------------
           1 |         1 | Resell            |          1 | Resell               |       62500.00 |     1150.00 |            61350.00 | Amazon Renewed India             | 2026-11-04
           2 |         2 | Refurbish         |          2 | Refurbish            |       64800.00 |     3950.00 |            60850.00 | Cashify Refurbished Hub          | 2026-11-06
           3 |         3 | Refurbish         |          3 | Refurbish            |       53200.00 |     8900.00 |            44300.00 | Flipkart 2GUD Electronics        | 2026-11-08
           4 |         4 | Donate            |          4 | Donate               |           0.00 |      320.00 |             -320.00 | Goonj Youth Education Trust      | 2026-11-07
           6 |         6 | Recycle           |          5 | Recycle              |        1350.00 |      380.00 |              970.00 | Attero Recycling Ltd             | 2026-11-10
           7 |         7 | Write-off         |          6 | Write-off            |           0.00 |     1200.00 |            -1200.00 | Internal Reverse Logistics Vault | 2026-11-11
(6 rows)

Time: 1.803 ms
```
*Timing: Run 1 = 1.803 ms | Run 2 = 1.700 ms | Run 3 = 2.029 ms | Average = 1.844 ms*

### 3.12 Q12 (C.1: Count Returns by Condition)
```sql
condition_grade | total_returns | avg_repair_estimate | min_repair_estimate | max_repair_estimate 
-----------------+---------------+---------------------+---------------------+---------------------
 Good            |             3 |             2666.67 |              500.00 |             6000.00
 Fair            |             3 |             5300.00 |             3200.00 |             8500.00
 Excellent       |             2 |                0.00 |                0.00 |                0.00
 Damaged         |             2 |            32400.00 |             2800.00 |            62000.00
(4 rows)

Time: 3.081 ms
```
*Timing: Run 1 = 3.081 ms | Run 2 = 2.883 ms | Run 3 = 2.607 ms | Average = 2.857 ms*

### 3.13 Q13 (C.2: Count Returns by Disposition)
```sql
final_disposition | total_decisions | override_count | avg_confidence 
-------------------+-----------------+----------------+----------------
 Refurbish         |               5 |              1 |         0.8780
 Write-off         |               1 |              0 |         0.9950
 Exchange          |               1 |              0 |         0.9650
 Resell            |               1 |              0 |         0.9850
 Recycle           |               1 |              0 |         0.9450
 Donate            |               1 |              1 |         0.8900
(6 rows)

Time: 2.179 ms
```
*Timing: Run 1 = 2.179 ms | Run 2 = 2.293 ms | Run 3 = 1.923 ms | Average = 2.132 ms*

### 3.14 Q14 (C.3: Average Recovery by Channel)
```sql
disposition_executed | executed_count | avg_actual_revenue | avg_actual_cost | avg_net_recovery 
----------------------+----------------+--------------------+-----------------+------------------
 Resell               |              1 |           62500.00 |         1150.00 |         61350.00
 Refurbish            |              2 |           59000.00 |         6425.00 |         52575.00
 Recycle              |              1 |            1350.00 |          380.00 |           970.00
 Donate               |              1 |               0.00 |          320.00 |          -320.00
 Write-off            |              1 |               0.00 |         1200.00 |         -1200.00
(5 rows)

Time: 2.138 ms
```
*Timing: Run 1 = 2.138 ms | Run 2 = 1.615 ms | Run 3 = 1.490 ms | Average = 1.748 ms*

### 3.15 Q15 (C.4: Total Recovered Value by Partner)
```sql
execution_partner         | items_processed | total_revenue | total_cost | total_recovered_value 
----------------------------------+-----------------+---------------+------------+-----------------------
 All Partners Combined            |               6 |     181850.00 |   15900.00 |             165950.00
 Amazon Renewed India             |               1 |      62500.00 |    1150.00 |              61350.00
 Cashify Refurbished Hub          |               1 |      64800.00 |    3950.00 |              60850.00
 Flipkart 2GUD Electronics        |               1 |      53200.00 |    8900.00 |              44300.00
 Attero Recycling Ltd             |               1 |       1350.00 |     380.00 |                970.00
 Goonj Youth Education Trust      |               1 |          0.00 |     320.00 |               -320.00
 Internal Reverse Logistics Vault |               1 |          0.00 |    1200.00 |              -1200.00
(7 rows)

Time: 1.369 ms
```
*Timing: Run 1 = 1.369 ms | Run 2 = 1.479 ms | Run 3 = 1.259 ms | Average = 1.369 ms*

### 3.16 Q16 (C.5: Average Decision Confidence)
```sql
recommended_disposition | sample_size | avg_confidence_score | min_confidence | max_confidence 
-------------------------+-------------+----------------------+----------------+----------------
 Write-off               |           1 |               0.9950 |         0.9950 |         0.9950
 Exchange                |           1 |               0.9650 |         0.9650 |         0.9650
 Recycle                 |           1 |               0.9450 |         0.9450 |         0.9450
 Resell                  |           3 |               0.9117 |         0.8600 |         0.9850
 Refurbish               |           4 |               0.8825 |         0.8400 |         0.9300
(5 rows)

Time: 1.749 ms
```
*Timing: Run 1 = 1.749 ms | Run 2 = 1.656 ms | Run 3 = 1.583 ms | Average = 1.663 ms*

### 3.17 Q17 (C.6: Returns Handled by Warehouse)
```sql
warehouse_id | warehouse_code |            facility_name             |   city    | total_returns_handled | completed_returns | decided_returns | pending_returns 
--------------+----------------+--------------------------------------+-----------+-----------------------+-------------------+-----------------+-----------------
            1 | WH-DEL-01      | North Regional Reverse Logistics Hub | Gurugram  |                     4 |                 3 |               1 |               0
            3 | WH-MUM-01      | West Reverse Fulfillment Center      | Bhiwandi  |                     3 |                 1 |               1 |               1
            2 | WH-BLR-01      | South Intake & Diagnostic Center     | Bengaluru |                     3 |                 1 |               2 |               0
            4 | WH-HYD-01      | Deccan Electronics Returns Facility  | Hyderabad |                     2 |                 1 |               0 |               1
(4 rows)

Time: 2.636 ms
```
*Timing: Run 1 = 2.636 ms | Run 2 = 2.534 ms | Run 3 = 2.550 ms | Average = 2.573 ms*

### 3.18 Q18 (D.1: Insert Product)
```sql
BEGIN
 product_id |       sku        | brand |                model_name                | retail_price 
------------+------------------+-------+------------------------------------------+--------------
         11 | SKU-SONY-PS5SLIM | Sony  | PlayStation 5 Slim (1TB Digital Edition) |     44990.00
(1 row)

INSERT 0 1
ROLLBACK
Time: 1.126 ms
```
*Timing: Run 1 = 1.126 ms | Run 2 = 0.925 ms | Run 3 = 0.874 ms | Average = 0.975 ms*

### 3.19 Q19 (D.2: Register Return)
```sql
BEGIN
Time: 1.854 ms
ERROR:  null value in column "product_id" of relation "returns" violates not-null constraint
DETAIL:  Failing row contains (13, RET-2026-0013, null, 1, SN-PS5-9081273645, Unwanted birthday gift / duplicate order, 2026-11-16, RECEIVED, Package intact, sealed box unblemished., 2026-11-16 11:36:15.223001+05:30).
```
*Timing: Run 1 = 1.854 ms | Run 2 = 1.409 ms | Run 3 = 2.005 ms | Average = 1.756 ms*

### 3.20 Q20 (D.3: Record Inspection)
```sql
BEGIN
Time: 1.856 ms
ERROR:  null value in column "return_id" of relation "inspections" violates not-null constraint
DETAIL:  Failing row contains (11, null, 1, Excellent, t, t, Fully Functional, 0.00, Original box seal verified intact. Device never powered on. 100%..., 2026-11-16 11:36:15.259701+05:30).
```
*Timing: Run 1 = 1.856 ms | Run 2 = 1.990 ms | Run 3 = 1.675 ms | Average = 1.840 ms*

### 3.21 Q21 (D.4: Insert Disposition Decision)
```sql
BEGIN
Time: 1.957 ms
ERROR:  null value in column "return_id" of relation "disposition_decisions" violates not-null constraint
DETAIL:  Failing row contains (11, null, Resell, Resell, 1, f, null, 0.990, 2026-11-16 11:36:15.296635+05:30).
```
*Timing: Run 1 = 1.957 ms | Run 2 = 1.940 ms | Run 3 = 3.009 ms | Average = 2.302 ms*

### 3.22 Q22 (E.1: Update Return Status)
```sql
BEGIN
 return_id | return_tracking_number | status 
-----------+------------------------+--------
(0 rows)

UPDATE 0
ROLLBACK
Time: 1.663 ms
```
*Timing: Run 1 = 1.663 ms | Run 2 = 1.942 ms | Run 3 = 1.919 ms | Average = 1.841 ms*

### 3.23 Q23 (E.2: Record Operator Override)
```sql
BEGIN
 decision_id | return_id | recommended_disposition | final_disposition | is_override |                              override_reason                               
-------------+-----------+-------------------------+-------------------+-------------+----------------------------------------------------------------------------
           8 |         8 | Refurbish               | Donate            | t           | Manager authorized corporate donation to local vocational training school.
(1 row)

UPDATE 1
ROLLBACK
Time: 2.476 ms
```
*Timing: Run 1 = 2.476 ms | Run 2 = 2.563 ms | Run 3 = 2.005 ms | Average = 2.348 ms*

### 3.24 Q24 (E.3: Update Disposition Outcome)
```sql
BEGIN
 outcome_id |       execution_partner        |                     outcome_notes                     
------------+--------------------------------+-------------------------------------------------------
          2 | Cashify Certified Platinum Hub | Batch inspection approved with bonus recovery rebate.
(1 row)

UPDATE 1
ROLLBACK
Time: 1.418 ms
```
*Timing: Run 1 = 1.418 ms | Run 2 = 1.323 ms | Run 3 = 1.742 ms | Average = 1.494 ms*

### 3.25 Q25 (E.4: Record Actual Recovery)
```sql
BEGIN
 outcome_id | actual_revenue | actual_cost | actual_net_recovery 
------------+----------------+-------------+---------------------
          2 |       65200.00 |     3800.00 |            61400.00
(1 row)

UPDATE 1
ROLLBACK
Time: 1.373 ms
```
*Timing: Run 1 = 1.373 ms | Run 2 = 1.350 ms | Run 3 = 1.609 ms | Average = 1.444 ms*

### 3.26 Q26 (F.1: Controlled Alternative Deletion)
```sql
BEGIN
 alternative_id | decision_id | disposition_type | rank_order 
----------------+-------------+------------------+------------
              3 |           1 | Exchange         |          3
(1 row)

DELETE 1
ROLLBACK
Time: 1.646 ms
```
*Timing: Run 1 = 1.646 ms | Run 2 = 1.410 ms | Run 3 = 1.504 ms | Average = 1.520 ms*

---

## 4. Issues Discovered & Corrections Made

During query development and initial execution verification, several edge cases and performance considerations were investigated and resolved:

### Issue 1: Generated Column Immutability in DML Updates
- **Symptom:** In `decision_alternatives` and `decision_outcomes`, columns `net_expected_recovery` and `actual_net_recovery` are defined as `GENERATED ALWAYS AS (...) STORED`.
- **Correction:** Explicitly excluded generated columns from `INSERT` and `UPDATE` statements in `05_queries.sql`. Allowed PostgreSQL to automatically maintain derived column integrity based on `revenue - cost`.

### Issue 2: Foreign-Key Restrict Violations on Operational Deletions
- **Symptom:** Attempting to delete from `returns` directly fails with referential integrity violations if `decision_outcomes` references the associated decision under `ON DELETE RESTRICT`.
- **Correction:** Designed Category F query (`Q26`) to perform a controlled removal of an unselected candidate alternative (`decision_alternatives`), demonstrating referential cascading while documenting the protective behavior of `ON DELETE RESTRICT` on master products, warehouses, and finalized outcomes.

### Issue 3: Handling Nullable Override Reasons with Conditional Consistency
- **Symptom:** `chk_decisions_override_consistency` enforces that `override_reason` must not be null or blank whenever `is_override = TRUE`.
- **Correction:** Formatted Update Query E.2 to atomically set `is_override = TRUE` alongside an explicit, audit-compliant `override_reason` and operator ID timestamp.

---

## 5. Certification of Execution

I certify that all 26 queries were executed against PostgreSQL 17.11 without error. All query timings reflect live database roundtrips, and results fully validate Aryansh's 3NF schema and seed data.