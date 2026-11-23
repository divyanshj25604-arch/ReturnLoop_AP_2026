# Return Loop — PostgreSQL Query Execution Plans (CP4)

**Database:** PostgreSQL 17.x (`returnloop_db`)  
**Command:** `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)`  
**Total Plans Generated:** 28  

This directory contains individual query execution plan files for each query used by the Return Loop platform, adhering to AP Checkpoint 4 specifications.

| Query ID | Type | Description | Plan File | Scan Type |
| :--- | :--- | :--- | :--- | :--- |
| **R1** | `READ` | Retrieve all returned products with catalog specifications | [`R1.txt`](./R1.txt) | `Seq Scan` |
| **R2** | `READ` | Retrieve returns by condition (Damaged items for salvage) | [`R2.txt`](./R2.txt) | `Index Scan` |
| **R3** | `READ` | Retrieve returns by regional warehouse (WH-DEL-01) | [`R3.txt`](./R3.txt) | `Index Scan` |
| **R4** | `READ` | Retrieve pending disposition decisions | [`R4.txt`](./R4.txt) | `Index Scan` |
| **R5** | `READ` | Retrieve completed returns with realized financial recovery | [`R5.txt`](./R5.txt) | `Seq Scan` |
| **R6** | `READ` | Join Returns with Products catalog specifications | [`R6.txt`](./R6.txt) | `Seq Scan` |
| **R7** | `READ` | Join Returns with Technical Inspections checklist | [`R7.txt`](./R7.txt) | `Seq Scan` |
| **R8** | `READ` | Join Returns with Regional Warehouses | [`R8.txt`](./R8.txt) | `Seq Scan` |
| **R9** | `READ` | Join Returns with Disposition Decisions | [`R9.txt`](./R9.txt) | `Seq Scan` |
| **R10** | `READ` | Join Decisions with Decision Alternatives (all 6 pathways) | [`R10.txt`](./R10.txt) | `Seq Scan` |
| **R11** | `READ` | Join Decisions with actual executed outcomes | [`R11.txt`](./R11.txt) | `Seq Scan` |
| **R12** | `READ` | Count returns grouped by condition grade | [`R12.txt`](./R12.txt) | `Seq Scan` |
| **R13** | `READ` | Count returns grouped by recommended disposition | [`R13.txt`](./R13.txt) | `Seq Scan` |
| **R14** | `READ` | Calculate average net recovery by executed disposition channel | [`R14.txt`](./R14.txt) | `Seq Scan` |
| **R15** | `READ` | Calculate total recovered salvage value by liquidation partner | [`R15.txt`](./R15.txt) | `Seq Scan` |
| **R16** | `READ` | Calculate average decision confidence score across all decisions | [`R16.txt`](./R16.txt) | `Seq Scan` |
| **R17** | `READ` | Calculate returns handled by each warehouse facility | [`R17.txt`](./R17.txt) | `Seq Scan` |
| **R18** | `READ` | Authenticate operator by email (Auth Login query) | [`R18.txt`](./R18.txt) | `Seq Scan` |
| **R19** | `READ` | Executive Dashboard summary metrics (status counts, revenue, recovery rate) | [`R19.txt`](./R19.txt) | `Seq Scan` |
| **W1** | `WRITE` | Insert a new product into master catalog | [`W1.txt`](./W1.txt) | `—` |
| **W2** | `WRITE` | Register a new incoming return intake record | [`W2.txt`](./W2.txt) | `—` |
| **W3** | `WRITE` | Record a multi-point technical inspection | [`W3.txt`](./W3.txt) | `—` |
| **W4** | `WRITE` | Insert an approved disposition decision | [`W4.txt`](./W4.txt) | `—` |
| **W5** | `WRITE` | Update return lifecycle status to DECIDED | [`W5.txt`](./W5.txt) | `—` |
| **W6** | `WRITE` | Record an operator override with audit reason | [`W6.txt`](./W6.txt) | `—` |
| **W7** | `WRITE` | Update disposition outcome execution partner & notes | [`W7.txt`](./W7.txt) | `—` |
| **W8** | `WRITE` | Record actual financial recovery revenue and processing cost | [`W8.txt`](./W8.txt) | `—` |
| **W9** | `WRITE` | Controlled deletion of unselected candidate alternative | [`W9.txt`](./W9.txt) | `—` |

---

## Execution Plans Details

### Query R1 [READ]: Retrieve all returned products with catalog specifications
```sql
Sort  (cost=13.07..13.11 rows=14 width=807) (actual time=0.065..0.066 rows=14.00 loops=1)
  Output: r.return_id, r.return_tracking_number, r.product_id, p.sku, p.brand, p.model_name, p.category, r.return_date, r.status
  Sort Key: r.return_id
  Sort Method: quicksort  Memory: 26kB
  Buffers: shared hit=5
  ->  Hash Join  (cost=1.32..12.80 rows=14 width=807) (actual time=0.037..0.043 rows=14.00 loops=1)
        Output: r.return_id, r.return_tracking_number, r.product_id, p.sku, p.brand, p.model_name, p.category, r.return_date, r.status
        Hash Cond: (p.product_id = r.product_id)
        Buffers: shared hit=2
        ->  Seq Scan on public.products p  (cost=0.00..10.90 rows=90 width=776) (actual time=0.006..0.007 rows=10.00 loops=1)
              Output: p.product_id, p.sku, p.brand, p.model_name, p.category, p.retail_price, p.created_at
              Buffers: shared hit=1
        ->  Hash  (cost=1.14..1.14 rows=14 width=35) (actual time=0.022..0.022 rows=14.00 loops=1)
              Output: r.return_id, r.return_tracking_number, r.product_id, r.return_date, r.status
              Buckets: 1024  Batches: 1  Memory Usage: 9kB
              Buffers: shared hit=1
              ->  Seq Scan on public.returns r  (cost=0.00..1.14 rows=14 width=35) (actual time=0.010..0.013 rows=14.00 loops=1)
                    Output: r.return_id, r.return_tracking_number, r.product_id, r.return_date, r.status
                    Buffers: shared hit=1
Planning:
  Buffers: shared hit=208
Planning Time: 1.393 ms
Execution Time: 0.138 ms
```

---

### Query R2 [READ]: Retrieve returns by condition (Damaged items for salvage)
```sql
Sort  (cost=9.02..9.03 rows=2 width=362) (actual time=0.063..0.064 rows=2.00 loops=1)
  Output: r.return_id, r.return_tracking_number, p.model_name, i.condition_grade, i.functional_status, i.repair_estimate
  Sort Key: i.repair_estimate DESC
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=9
  ->  Nested Loop  (cost=1.30..9.01 rows=2 width=362) (actual time=0.037..0.043 rows=2.00 loops=1)
        Output: r.return_id, r.return_tracking_number, p.model_name, i.condition_grade, i.functional_status, i.repair_estimate
        Inner Unique: true
        Buffers: shared hit=6
        ->  Hash Join  (cost=1.15..2.36 rows=2 width=48) (actual time=0.025..0.028 rows=2.00 loops=1)
              Output: r.return_id, r.return_tracking_number, r.product_id, i.condition_grade, i.functional_status, i.repair_estimate
              Hash Cond: (r.return_id = i.return_id)
              Buffers: shared hit=2
              ->  Seq Scan on public.returns r  (cost=0.00..1.14 rows=14 width=22) (actual time=0.003..0.004 rows=14.00 loops=1)
                    Output: r.return_id, r.return_tracking_number, r.product_id, r.warehouse_id, r.serial_number, r.return_reason, r.return_date, r.status, r.customer_comment, r.created_at
                    Buffers: shared hit=1
              ->  Hash  (cost=1.12..1.12 rows=2 width=30) (actual time=0.015..0.016 rows=2.00 loops=1)
                    Output: i.condition_grade, i.functional_status, i.repair_estimate, i.return_id
                    Buckets: 1024  Batches: 1  Memory Usage: 9kB
                    Buffers: shared hit=1
                    ->  Seq Scan on public.inspections i  (cost=0.00..1.12 rows=2 width=30) (actual time=0.009..0.012 rows=2.00 loops=1)
                          Output: i.condition_grade, i.functional_status, i.repair_estimate, i.return_id
                          Filter: ((i.condition_grade)::text = 'Damaged'::text)
                          Rows Removed by Filter: 8
                          Buffers: shared hit=1
        ->  Memoize  (cost=0.15..3.31 rows=1 width=322) (actual time=0.006..0.006 rows=1.00 loops=2)
              Output: p.model_name, p.product_id
              Cache Key: r.product_id
              Cache Mode: logical
              Hits: 0  Misses: 2  Evictions: 0  Overflows: 0  Memory Usage: 1kB
              Buffers: shared hit=4
              ->  Index Scan using products_pkey on public.products p  (cost=0.14..3.30 rows=1 width=322) (actual time=0.004..0.004 rows=1.00 loops=2)
                    Output: p.model_name, p.product_id
                    Index Cond: (p.product_id = r.product_id)
                    Index Searches: 2
                    Buffers: shared hit=4
Planning:
  Buffers: shared hit=80
Planning Time: 0.607 ms
Execution Time: 0.096 ms
```

---

### Query R3 [READ]: Retrieve returns by regional warehouse (WH-DEL-01)
```sql
Sort  (cost=9.36..9.37 rows=1 width=425) (actual time=0.032..0.032 rows=4.00 loops=1)
  Output: r.return_id, r.return_tracking_number, w.warehouse_code, w.facility_name, w.city, r.return_date, r.status
  Sort Key: r.return_date DESC
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=6
  ->  Hash Join  (cost=8.17..9.35 rows=1 width=425) (actual time=0.022..0.025 rows=4.00 loops=1)
        Output: r.return_id, r.return_tracking_number, w.warehouse_code, w.facility_name, w.city, r.return_date, r.status
        Inner Unique: true
        Hash Cond: (r.warehouse_id = w.warehouse_id)
        Buffers: shared hit=3
        ->  Seq Scan on public.returns r  (cost=0.00..1.14 rows=14 width=35) (actual time=0.003..0.004 rows=14.00 loops=1)
              Output: r.return_id, r.return_tracking_number, r.product_id, r.warehouse_id, r.serial_number, r.return_reason, r.return_date, r.status, r.customer_comment, r.created_at
              Buffers: shared hit=1
        ->  Hash  (cost=8.16..8.16 rows=1 width=398) (actual time=0.017..0.017 rows=1.00 loops=1)
              Output: w.warehouse_code, w.facility_name, w.city, w.warehouse_id
              Buckets: 1024  Batches: 1  Memory Usage: 9kB
              Buffers: shared hit=2
              ->  Index Scan using uq_warehouses_code on public.warehouses w  (cost=0.14..8.16 rows=1 width=398) (actual time=0.014..0.014 rows=1.00 loops=1)
                    Output: w.warehouse_code, w.facility_name, w.city, w.warehouse_id
                    Index Cond: ((w.warehouse_code)::text = 'WH-DEL-01'::text)
                    Index Searches: 1
                    Buffers: shared hit=2
Planning:
  Buffers: shared hit=64
Planning Time: 0.279 ms
Execution Time: 0.045 ms
```

---

### Query R4 [READ]: Retrieve pending disposition decisions
```sql
Sort  (cost=5.74..5.74 rows=1 width=380) (actual time=0.024..0.024 rows=4.00 loops=1)
  Output: r.return_id, r.return_tracking_number, p.model_name, r.status, r.return_date, r.return_reason
  Sort Key: r.return_date
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=10
  ->  Nested Loop  (cost=1.35..5.73 rows=1 width=380) (actual time=0.017..0.022 rows=4.00 loops=1)
        Output: r.return_id, r.return_tracking_number, p.model_name, r.status, r.return_date, r.return_reason
        Inner Unique: true
        Buffers: shared hit=10
        ->  Hash Left Join  (cost=1.20..2.42 rows=1 width=66) (actual time=0.013..0.014 rows=4.00 loops=1)
              Output: r.return_id, r.return_tracking_number, r.status, r.return_date, r.return_reason, r.product_id
              Inner Unique: true
              Hash Cond: (r.return_id = dd.return_id)
              Filter: (dd.decision_id IS NULL)
              Rows Removed by Filter: 9
              Buffers: shared hit=2
              ->  Seq Scan on public.returns r  (cost=0.00..1.18 rows=13 width=66) (actual time=0.003..0.005 rows=13.00 loops=1)
                    Output: r.return_id, r.return_tracking_number, r.product_id, r.warehouse_id, r.serial_number, r.return_reason, r.return_date, r.status, r.customer_comment, r.created_at
                    Filter: ((r.status)::text <> 'CANCELLED'::text)
                    Rows Removed by Filter: 1
                    Buffers: shared hit=1
              ->  Hash  (cost=1.09..1.09 rows=9 width=8) (actual time=0.005..0.005 rows=9.00 loops=1)
                    Output: dd.decision_id, dd.return_id
                    Buckets: 1024  Batches: 1  Memory Usage: 9kB
                    Buffers: shared hit=1
                    ->  Seq Scan on public.disposition_decisions dd  (cost=0.00..1.09 rows=9 width=8) (actual time=0.002..0.003 rows=9.00 loops=1)
                          Output: dd.decision_id, dd.return_id
                          Buffers: shared hit=1
        ->  Index Scan using products_pkey on public.products p  (cost=0.14..3.24 rows=1 width=322) (actual time=0.001..0.001 rows=1.00 loops=4)
              Output: p.product_id, p.sku, p.brand, p.model_name, p.category, p.retail_price, p.created_at
              Index Cond: (p.product_id = r.product_id)
              Index Searches: 4
              Buffers: shared hit=8
Planning:
  Buffers: shared hit=80 dirtied=1
Planning Time: 0.501 ms
Execution Time: 0.036 ms
```

---

### Query R5 [READ]: Retrieve completed returns with realized financial recovery
```sql
Sort  (cost=28.19..28.37 rows=71 width=432) (actual time=0.086..0.087 rows=6.00 loops=1)
  Output: r.return_id, r.return_tracking_number, p.model_name, r.status, dd.final_disposition, doc.disposition_executed, doc.actual_net_recovery, doc.completion_date
  Sort Key: doc.completion_date DESC
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=4
  ->  Hash Join  (cost=13.77..26.01 rows=71 width=432) (actual time=0.078..0.082 rows=6.00 loops=1)
        Output: r.return_id, r.return_tracking_number, p.model_name, r.status, dd.final_disposition, doc.disposition_executed, doc.actual_net_recovery, doc.completion_date
        Hash Cond: (doc.decision_id = dd.decision_id)
        Buffers: shared hit=4
        ->  Seq Scan on public.decision_outcomes doc  (cost=0.00..11.60 rows=160 width=82) (actual time=0.011..0.011 rows=6.00 loops=1)
              Output: doc.outcome_id, doc.decision_id, doc.disposition_executed, doc.actual_revenue, doc.actual_cost, doc.actual_net_recovery, doc.execution_partner, doc.completion_date, doc.outcome_notes, doc.created_at
              Buffers: shared hit=1
        ->  Hash  (cost=13.72..13.72 rows=4 width=358) (actual time=0.064..0.065 rows=6.00 loops=1)
              Output: r.return_id, r.return_tracking_number, r.status, p.model_name, dd.final_disposition, dd.decision_id
              Buckets: 1024  Batches: 1  Memory Usage: 9kB
              Buffers: shared hit=3
              ->  Hash Join  (cost=2.44..13.72 rows=4 width=358) (actual time=0.045..0.060 rows=6.00 loops=1)
                    Output: r.return_id, r.return_tracking_number, r.status, p.model_name, dd.final_disposition, dd.decision_id
                    Hash Cond: (p.product_id = r.product_id)
                    Buffers: shared hit=3
                    ->  Seq Scan on public.products p  (cost=0.00..10.90 rows=90 width=322) (actual time=0.003..0.004 rows=10.00 loops=1)
                          Output: p.product_id, p.sku, p.brand, p.model_name, p.category, p.retail_price, p.created_at
                          Buffers: shared hit=1
                    ->  Hash  (cost=2.39..2.39 rows=4 width=44) (actual time=0.035..0.036 rows=6.00 loops=1)
                          Output: r.return_id, r.return_tracking_number, r.status, r.product_id, dd.final_disposition, dd.decision_id
                          Buckets: 1024  Batches: 1  Memory Usage: 9kB
                          Buffers: shared hit=2
                          ->  Hash Join  (cost=1.20..2.39 rows=4 width=44) (actual time=0.026..0.031 rows=6.00 loops=1)
                                Output: r.return_id, r.return_tracking_number, r.status, r.product_id, dd.final_disposition, dd.decision_id
                                Inner Unique: true
                                Hash Cond: (r.return_id = dd.return_id)
                                Buffers: shared hit=2
                                ->  Seq Scan on public.returns r  (cost=0.00..1.18 rows=6 width=31) (actual time=0.004..0.006 rows=6.00 loops=1)
                                      Output: r.return_id, r.return_tracking_number, r.product_id, r.warehouse_id, r.serial_number, r.return_reason, r.return_date, r.status, r.customer_comment, r.created_at
                                      Filter: ((r.status)::text = 'COMPLETED'::text)
                                      Rows Removed by Filter: 8
                                      Buffers: shared hit=1
                                ->  Hash  (cost=1.09..1.09 rows=9 width=17) (actual time=0.013..0.013 rows=9.00 loops=1)
                                      Output: dd.final_disposition, dd.return_id, dd.decision_id
                                      Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                      Buffers: shared hit=1
                                      ->  Seq Scan on public.disposition_decisions dd  (cost=0.00..1.09 rows=9 width=17) (actual time=0.005..0.007 rows=9.00 loops=1)
                                            Output: dd.final_disposition, dd.return_id, dd.decision_id
                                            Buffers: shared hit=1
Planning:
  Buffers: shared hit=75
Planning Time: 0.745 ms
Execution Time: 0.124 ms
```

---

### Query R6 [READ]: Join Returns with Products catalog specifications
```sql
Sort  (cost=13.07..13.11 rows=14 width=834) (actual time=0.024..0.025 rows=14.00 loops=1)
  Output: r.return_id, r.return_tracking_number, r.serial_number, r.status, p.sku, p.brand, p.model_name, p.category, p.retail_price
  Sort Key: r.return_id
  Sort Method: quicksort  Memory: 26kB
  Buffers: shared hit=2
  ->  Hash Join  (cost=1.32..12.80 rows=14 width=834) (actual time=0.014..0.018 rows=14.00 loops=1)
        Output: r.return_id, r.return_tracking_number, r.serial_number, r.status, p.sku, p.brand, p.model_name, p.category, p.retail_price
        Hash Cond: (p.product_id = r.product_id)
        Buffers: shared hit=2
        ->  Seq Scan on public.products p  (cost=0.00..10.90 rows=90 width=792) (actual time=0.003..0.004 rows=10.00 loops=1)
              Output: p.product_id, p.sku, p.brand, p.model_name, p.category, p.retail_price, p.created_at
              Buffers: shared hit=1
        ->  Hash  (cost=1.14..1.14 rows=14 width=50) (actual time=0.008..0.008 rows=14.00 loops=1)
              Output: r.return_id, r.return_tracking_number, r.serial_number, r.status, r.product_id
              Buckets: 1024  Batches: 1  Memory Usage: 10kB
              Buffers: shared hit=1
              ->  Seq Scan on public.returns r  (cost=0.00..1.14 rows=14 width=50) (actual time=0.002..0.004 rows=14.00 loops=1)
                    Output: r.return_id, r.return_tracking_number, r.serial_number, r.status, r.product_id
                    Buffers: shared hit=1
Planning:
  Buffers: shared hit=5
Planning Time: 0.069 ms
Execution Time: 0.035 ms
```

---

### Query R7 [READ]: Join Returns with Technical Inspections checklist
```sql
Sort  (cost=25.28..25.31 rows=10 width=594) (actual time=0.049..0.050 rows=10.00 loops=1)
  Output: r.return_id, r.return_tracking_number, p.model_name, i.inspection_id, i.condition_grade, i.functional_status, i.has_original_packaging, i.has_all_accessories, i.repair_estimate, o.full_name, i.inspected_at
  Sort Key: i.inspected_at DESC
  Sort Method: quicksort  Memory: 26kB
  Buffers: shared hit=7
  ->  Hash Join  (cost=13.78..25.11 rows=10 width=594) (actual time=0.036..0.040 rows=10.00 loops=1)
        Output: r.return_id, r.return_tracking_number, p.model_name, i.inspection_id, i.condition_grade, i.functional_status, i.has_original_packaging, i.has_all_accessories, i.repair_estimate, o.full_name, i.inspected_at
        Hash Cond: (p.product_id = r.product_id)
        Buffers: shared hit=4
        ->  Seq Scan on public.products p  (cost=0.00..10.90 rows=90 width=322) (actual time=0.004..0.004 rows=10.00 loops=1)
              Output: p.product_id, p.sku, p.brand, p.model_name, p.category, p.retail_price, p.created_at
              Buffers: shared hit=1
        ->  Hash  (cost=13.65..13.65 rows=10 width=280) (actual time=0.030..0.031 rows=10.00 loops=1)
              Output: r.return_id, r.return_tracking_number, r.product_id, i.inspection_id, i.condition_grade, i.functional_status, i.has_original_packaging, i.has_all_accessories, i.repair_estimate, i.inspected_at, o.full_name
              Buckets: 1024  Batches: 1  Memory Usage: 10kB
              Buffers: shared hit=3
              ->  Hash Join  (cost=2.54..13.65 rows=10 width=280) (actual time=0.024..0.028 rows=10.00 loops=1)
                    Output: r.return_id, r.return_tracking_number, r.product_id, i.inspection_id, i.condition_grade, i.functional_status, i.has_original_packaging, i.has_all_accessories, i.repair_estimate, i.inspected_at, o.full_name
                    Inner Unique: true
                    Hash Cond: (i.return_id = r.return_id)
                    Buffers: shared hit=3
                    ->  Hash Join  (cost=1.23..12.30 rows=10 width=262) (actual time=0.015..0.017 rows=10.00 loops=1)
                          Output: i.inspection_id, i.condition_grade, i.functional_status, i.has_original_packaging, i.has_all_accessories, i.repair_estimate, i.inspected_at, i.return_id, o.full_name
                          Hash Cond: (o.operator_id = i.inspector_id)
                          Buffers: shared hit=2
                          ->  Seq Scan on public.operators o  (cost=0.00..10.60 rows=60 width=222) (actual time=0.005..0.005 rows=5.00 loops=1)
                                Output: o.operator_id, o.employee_code, o.full_name, o.email, o.password_hash, o.app_role, o.role, o.warehouse_id, o.is_active, o.created_at
                                Buffers: shared hit=1
                          ->  Hash  (cost=1.10..1.10 rows=10 width=48) (actual time=0.007..0.007 rows=10.00 loops=1)
                                Output: i.inspection_id, i.condition_grade, i.functional_status, i.has_original_packaging, i.has_all_accessories, i.repair_estimate, i.inspected_at, i.return_id, i.inspector_id
                                Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                Buffers: shared hit=1
                                ->  Seq Scan on public.inspections i  (cost=0.00..1.10 rows=10 width=48) (actual time=0.003..0.004 rows=10.00 loops=1)
                                      Output: i.inspection_id, i.condition_grade, i.functional_status, i.has_original_packaging, i.has_all_accessories, i.repair_estimate, i.inspected_at, i.return_id, i.inspector_id
                                      Buffers: shared hit=1
                    ->  Hash  (cost=1.14..1.14 rows=14 width=22) (actual time=0.007..0.007 rows=14.00 loops=1)
                          Output: r.return_id, r.return_tracking_number, r.product_id
                          Buckets: 1024  Batches: 1  Memory Usage: 9kB
                          Buffers: shared hit=1
                          ->  Seq Scan on public.returns r  (cost=0.00..1.14 rows=14 width=22) (actual time=0.003..0.005 rows=14.00 loops=1)
                                Output: r.return_id, r.return_tracking_number, r.product_id
                                Buffers: shared hit=1
Planning:
  Buffers: shared hit=109
Planning Time: 0.931 ms
Execution Time: 0.083 ms
```

---

### Query R8 [READ]: Join Returns with Regional Warehouses
```sql
Sort  (cost=14.17..14.21 rows=14 width=543) (actual time=0.081..0.082 rows=14.00 loops=1)
  Output: r.return_id, r.return_tracking_number, r.return_date, r.status, w.warehouse_code, w.facility_name, w.city, w.state
  Sort Key: w.warehouse_code, r.return_date DESC
  Sort Method: quicksort  Memory: 26kB
  Buffers: shared hit=5
  ->  Hash Join  (cost=1.32..13.90 rows=14 width=543) (actual time=0.031..0.035 rows=14.00 loops=1)
        Output: r.return_id, r.return_tracking_number, r.return_date, r.status, w.warehouse_code, w.facility_name, w.city, w.state
        Hash Cond: (w.warehouse_id = r.warehouse_id)
        Buffers: shared hit=2
        ->  Seq Scan on public.warehouses w  (cost=0.00..11.40 rows=140 width=516) (actual time=0.015..0.016 rows=4.00 loops=1)
              Output: w.warehouse_id, w.warehouse_code, w.facility_name, w.city, w.state, w.capacity, w.created_at
              Buffers: shared hit=1
        ->  Hash  (cost=1.14..1.14 rows=14 width=35) (actual time=0.012..0.012 rows=14.00 loops=1)
              Output: r.return_id, r.return_tracking_number, r.return_date, r.status, r.warehouse_id
              Buckets: 1024  Batches: 1  Memory Usage: 9kB
              Buffers: shared hit=1
              ->  Seq Scan on public.returns r  (cost=0.00..1.14 rows=14 width=35) (actual time=0.003..0.006 rows=14.00 loops=1)
                    Output: r.return_id, r.return_tracking_number, r.return_date, r.status, r.warehouse_id
                    Buffers: shared hit=1
Planning:
  Buffers: shared hit=5
Planning Time: 0.159 ms
Execution Time: 0.099 ms
```

---

### Query R9 [READ]: Join Returns with Disposition Decisions
```sql
Sort  (cost=25.30..25.32 rows=9 width=701) (actual time=0.063..0.072 rows=9.00 loops=1)
  Output: r.return_id, r.return_tracking_number, p.model_name, dd.decision_id, dd.recommended_disposition, dd.final_disposition, dd.is_override, dd.override_reason, dd.confidence_score, o.full_name, dd.decided_at
  Sort Key: dd.decided_at DESC
  Sort Method: quicksort  Memory: 26kB
  Buffers: shared hit=4
  ->  Hash Join  (cost=13.83..25.16 rows=9 width=701) (actual time=0.052..0.064 rows=9.00 loops=1)
        Output: r.return_id, r.return_tracking_number, p.model_name, dd.decision_id, dd.recommended_disposition, dd.final_disposition, dd.is_override, dd.override_reason, dd.confidence_score, o.full_name, dd.decided_at
        Hash Cond: (p.product_id = r.product_id)
        Buffers: shared hit=4
        ->  Seq Scan on public.products p  (cost=0.00..10.90 rows=90 width=322) (actual time=0.007..0.008 rows=10.00 loops=1)
              Output: p.product_id, p.sku, p.brand, p.model_name, p.category, p.retail_price, p.created_at
              Buffers: shared hit=1
        ->  Hash  (cost=13.72..13.72 rows=9 width=387) (actual time=0.042..0.050 rows=9.00 loops=1)
              Output: r.return_id, r.return_tracking_number, r.product_id, dd.decision_id, dd.recommended_disposition, dd.final_disposition, dd.is_override, dd.override_reason, dd.confidence_score, dd.decided_at, o.full_name
              Buckets: 1024  Batches: 1  Memory Usage: 10kB
              Buffers: shared hit=3
              ->  Hash Join  (cost=2.50..13.72 rows=9 width=387) (actual time=0.035..0.046 rows=9.00 loops=1)
                    Output: r.return_id, r.return_tracking_number, r.product_id, dd.decision_id, dd.recommended_disposition, dd.final_disposition, dd.is_override, dd.override_reason, dd.confidence_score, dd.decided_at, o.full_name
                    Hash Cond: (o.operator_id = dd.decided_by_operator_id)
                    Buffers: shared hit=3
                    ->  Seq Scan on public.operators o  (cost=0.00..10.60 rows=60 width=222) (actual time=0.005..0.005 rows=5.00 loops=1)
                          Output: o.operator_id, o.employee_code, o.full_name, o.email, o.password_hash, o.app_role, o.role, o.warehouse_id, o.is_active, o.created_at
                          Buffers: shared hit=1
                    ->  Hash  (cost=2.39..2.39 rows=9 width=173) (actual time=0.027..0.035 rows=9.00 loops=1)
                          Output: r.return_id, r.return_tracking_number, r.product_id, dd.decision_id, dd.recommended_disposition, dd.final_disposition, dd.is_override, dd.override_reason, dd.confidence_score, dd.decided_at, dd.decided_by_operator_id
                          Buckets: 1024  Batches: 1  Memory Usage: 10kB
                          Buffers: shared hit=2
                          ->  Hash Join  (cost=1.20..2.39 rows=9 width=173) (actual time=0.018..0.031 rows=9.00 loops=1)
                                Output: r.return_id, r.return_tracking_number, r.product_id, dd.decision_id, dd.recommended_disposition, dd.final_disposition, dd.is_override, dd.override_reason, dd.confidence_score, dd.decided_at, dd.decided_by_operator_id
                                Inner Unique: true
                                Hash Cond: (r.return_id = dd.return_id)
                                Buffers: shared hit=2
                                ->  Seq Scan on public.returns r  (cost=0.00..1.14 rows=14 width=22) (actual time=0.002..0.003 rows=14.00 loops=1)
                                      Output: r.return_id, r.return_tracking_number, r.product_id, r.warehouse_id, r.serial_number, r.return_reason, r.return_date, r.status, r.customer_comment, r.created_at
                                      Buffers: shared hit=1
                                ->  Hash  (cost=1.09..1.09 rows=9 width=155) (actual time=0.012..0.019 rows=9.00 loops=1)
                                      Output: dd.decision_id, dd.recommended_disposition, dd.final_disposition, dd.is_override, dd.override_reason, dd.confidence_score, dd.decided_at, dd.return_id, dd.decided_by_operator_id
                                      Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                      Buffers: shared hit=1
                                      ->  Seq Scan on public.disposition_decisions dd  (cost=0.00..1.09 rows=9 width=155) (actual time=0.004..0.007 rows=9.00 loops=1)
                                            Output: dd.decision_id, dd.recommended_disposition, dd.final_disposition, dd.is_override, dd.override_reason, dd.confidence_score, dd.decided_at, dd.return_id, dd.decided_by_operator_id
                                            Buffers: shared hit=1
Planning:
  Buffers: shared hit=24
Planning Time: 0.300 ms
Execution Time: 0.105 ms
```

---

### Query R10 [READ]: Join Decisions with Decision Alternatives (all 6 pathways)
```sql
Sort  (cost=4.13..4.14 rows=6 width=60) (actual time=0.038..0.040 rows=6.00 loops=1)
  Output: dd.decision_id, r.return_tracking_number, dd.final_disposition, da.disposition_type, da.estimated_revenue, da.estimated_cost, da.net_expected_recovery, da.feasibility_score, da.rank_order, da.is_recommended
  Sort Key: da.rank_order
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=3
  ->  Nested Loop  (cost=1.12..4.05 rows=6 width=60) (actual time=0.026..0.035 rows=6.00 loops=1)
        Output: dd.decision_id, r.return_tracking_number, dd.final_disposition, da.disposition_type, da.estimated_revenue, da.estimated_cost, da.net_expected_recovery, da.feasibility_score, da.rank_order, da.is_recommended
        Buffers: shared hit=3
        ->  Hash Join  (cost=1.12..2.31 rows=1 width=27) (actual time=0.015..0.018 rows=1.00 loops=1)
              Output: dd.decision_id, dd.final_disposition, r.return_tracking_number
              Inner Unique: true
              Hash Cond: (r.return_id = dd.return_id)
              Buffers: shared hit=2
              ->  Seq Scan on public.returns r  (cost=0.00..1.14 rows=14 width=18) (actual time=0.004..0.005 rows=14.00 loops=1)
                    Output: r.return_id, r.return_tracking_number, r.product_id, r.warehouse_id, r.serial_number, r.return_reason, r.return_date, r.status, r.customer_comment, r.created_at
                    Buffers: shared hit=1
              ->  Hash  (cost=1.11..1.11 rows=1 width=17) (actual time=0.008..0.008 rows=1.00 loops=1)
                    Output: dd.decision_id, dd.final_disposition, dd.return_id
                    Buckets: 1024  Batches: 1  Memory Usage: 9kB
                    Buffers: shared hit=1
                    ->  Seq Scan on public.disposition_decisions dd  (cost=0.00..1.11 rows=1 width=17) (actual time=0.005..0.006 rows=1.00 loops=1)
                          Output: dd.decision_id, dd.final_disposition, dd.return_id
                          Filter: (dd.decision_id = 1)
                          Rows Removed by Filter: 8
                          Buffers: shared hit=1
        ->  Seq Scan on public.decision_alternatives da  (cost=0.00..1.68 rows=6 width=37) (actual time=0.009..0.014 rows=6.00 loops=1)
              Output: da.alternative_id, da.decision_id, da.disposition_type, da.estimated_revenue, da.estimated_cost, da.net_expected_recovery, da.feasibility_score, da.rank_order, da.is_recommended, da.rationale, da.created_at
              Filter: (da.decision_id = 1)
              Rows Removed by Filter: 48
              Buffers: shared hit=1
Planning:
  Buffers: shared hit=91
Planning Time: 0.748 ms
Execution Time: 0.057 ms
```

---

### Query R11 [READ]: Join Decisions with actual executed outcomes
```sql
Sort  (cost=32.09..32.49 rows=160 width=773) (actual time=0.038..0.039 rows=6.00 loops=1)
  Output: dd.decision_id, r.return_tracking_number, p.model_name, dd.final_disposition, doc.disposition_executed, doc.actual_revenue, doc.actual_cost, doc.actual_net_recovery, doc.execution_partner, doc.completion_date
  Sort Key: doc.actual_net_recovery DESC
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=4
  ->  Hash Join  (cost=13.94..26.23 rows=160 width=773) (actual time=0.032..0.035 rows=6.00 loops=1)
        Output: dd.decision_id, r.return_tracking_number, p.model_name, dd.final_disposition, doc.disposition_executed, doc.actual_revenue, doc.actual_cost, doc.actual_net_recovery, doc.execution_partner, doc.completion_date
        Hash Cond: (doc.decision_id = dd.decision_id)
        Buffers: shared hit=4
        ->  Seq Scan on public.decision_outcomes doc  (cost=0.00..11.60 rows=160 width=432) (actual time=0.003..0.004 rows=6.00 loops=1)
              Output: doc.outcome_id, doc.decision_id, doc.disposition_executed, doc.actual_revenue, doc.actual_cost, doc.actual_net_recovery, doc.execution_partner, doc.completion_date, doc.outcome_notes, doc.created_at
              Buffers: shared hit=1
        ->  Hash  (cost=13.83..13.83 rows=9 width=345) (actual time=0.027..0.028 rows=9.00 loops=1)
              Output: dd.decision_id, dd.final_disposition, r.return_tracking_number, p.model_name
              Buckets: 1024  Batches: 1  Memory Usage: 9kB
              Buffers: shared hit=3
              ->  Hash Join  (cost=2.50..13.83 rows=9 width=345) (actual time=0.016..0.026 rows=9.00 loops=1)
                    Output: dd.decision_id, dd.final_disposition, r.return_tracking_number, p.model_name
                    Hash Cond: (p.product_id = r.product_id)
                    Buffers: shared hit=3
                    ->  Seq Scan on public.products p  (cost=0.00..10.90 rows=90 width=322) (actual time=0.002..0.009 rows=10.00 loops=1)
                          Output: p.product_id, p.sku, p.brand, p.model_name, p.category, p.retail_price, p.created_at
                          Buffers: shared hit=1
                    ->  Hash  (cost=2.39..2.39 rows=9 width=31) (actual time=0.013..0.013 rows=9.00 loops=1)
                          Output: dd.decision_id, dd.final_disposition, r.return_tracking_number, r.product_id
                          Buckets: 1024  Batches: 1  Memory Usage: 9kB
                          Buffers: shared hit=2
                          ->  Hash Join  (cost=1.20..2.39 rows=9 width=31) (actual time=0.008..0.011 rows=9.00 loops=1)
                                Output: dd.decision_id, dd.final_disposition, r.return_tracking_number, r.product_id
                                Inner Unique: true
                                Hash Cond: (r.return_id = dd.return_id)
                                Buffers: shared hit=2
                                ->  Seq Scan on public.returns r  (cost=0.00..1.14 rows=14 width=22) (actual time=0.001..0.002 rows=14.00 loops=1)
                                      Output: r.return_id, r.return_tracking_number, r.product_id, r.warehouse_id, r.serial_number, r.return_reason, r.return_date, r.status, r.customer_comment, r.created_at
                                      Buffers: shared hit=1
                                ->  Hash  (cost=1.09..1.09 rows=9 width=17) (actual time=0.005..0.006 rows=9.00 loops=1)
                                      Output: dd.decision_id, dd.final_disposition, dd.return_id
                                      Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                      Buffers: shared hit=1
                                      ->  Seq Scan on public.disposition_decisions dd  (cost=0.00..1.09 rows=9 width=17) (actual time=0.003..0.004 rows=9.00 loops=1)
                                            Output: dd.decision_id, dd.final_disposition, dd.return_id
                                            Buffers: shared hit=1
Planning:
  Buffers: shared hit=6
Planning Time: 0.130 ms
Execution Time: 0.051 ms
```

---

### Query R12 [READ]: Count returns grouped by condition grade
```sql
Sort  (cost=2.68..2.69 rows=4 width=110) (actual time=0.084..0.085 rows=4.00 loops=1)
  Output: i.condition_grade, (count(r.return_id)), (round(avg(i.repair_estimate), 2)), (min(i.repair_estimate)), (max(i.repair_estimate))
  Sort Key: (count(r.return_id)) DESC
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=5
  ->  HashAggregate  (cost=2.58..2.64 rows=4 width=110) (actual time=0.066..0.072 rows=4.00 loops=1)
        Output: i.condition_grade, count(r.return_id), round(avg(i.repair_estimate), 2), min(i.repair_estimate), max(i.repair_estimate)
        Group Key: i.condition_grade
        Batches: 1  Memory Usage: 32kB
        Buffers: shared hit=2
        ->  Hash Join  (cost=1.32..2.45 rows=10 width=14) (actual time=0.023..0.030 rows=10.00 loops=1)
              Output: i.condition_grade, r.return_id, i.repair_estimate
              Inner Unique: true
              Hash Cond: (i.return_id = r.return_id)
              Buffers: shared hit=2
              ->  Seq Scan on public.inspections i  (cost=0.00..1.10 rows=10 width=14) (actual time=0.006..0.008 rows=10.00 loops=1)
                    Output: i.inspection_id, i.return_id, i.inspector_id, i.condition_grade, i.has_original_packaging, i.has_all_accessories, i.functional_status, i.repair_estimate, i.diagnostic_notes, i.inspected_at
                    Buffers: shared hit=1
              ->  Hash  (cost=1.14..1.14 rows=14 width=4) (actual time=0.012..0.012 rows=14.00 loops=1)
                    Output: r.return_id
                    Buckets: 1024  Batches: 1  Memory Usage: 9kB
                    Buffers: shared hit=1
                    ->  Seq Scan on public.returns r  (cost=0.00..1.14 rows=14 width=4) (actual time=0.003..0.006 rows=14.00 loops=1)
                          Output: r.return_id
                          Buffers: shared hit=1
Planning:
  Buffers: shared hit=34
Planning Time: 0.255 ms
Execution Time: 0.149 ms
```

---

### Query R13 [READ]: Count returns grouped by recommended disposition
```sql
Sort  (cost=1.38..1.39 rows=5 width=88) (actual time=0.025..0.025 rows=5.00 loops=1)
  Output: recommended_disposition, (count(decision_id)), (sum(CASE WHEN is_override THEN 1 ELSE 0 END)), (round((((sum(CASE WHEN is_override THEN 1 ELSE 0 END))::numeric / (count(decision_id))::numeric) * '100'::numeric), 2)), (round(avg(confidence_score), 3))
  Sort Key: (count(dd.decision_id)) DESC
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=1
  ->  HashAggregate  (cost=1.18..1.32 rows=5 width=88) (actual time=0.018..0.022 rows=5.00 loops=1)
        Output: recommended_disposition, count(decision_id), sum(CASE WHEN is_override THEN 1 ELSE 0 END), round((((sum(CASE WHEN is_override THEN 1 ELSE 0 END))::numeric / (count(decision_id))::numeric) * '100'::numeric), 2), round(avg(confidence_score), 3)
        Group Key: dd.recommended_disposition
        Batches: 1  Memory Usage: 32kB
        Buffers: shared hit=1
        ->  Seq Scan on public.disposition_decisions dd  (cost=0.00..1.09 rows=9 width=18) (actual time=0.004..0.005 rows=9.00 loops=1)
              Output: decision_id, return_id, recommended_disposition, final_disposition, decided_by_operator_id, is_override, override_reason, confidence_score, decided_at
              Buffers: shared hit=1
Planning:
  Buffers: shared hit=3
Planning Time: 0.062 ms
Execution Time: 0.042 ms
```

---

### Query R14 [READ]: Calculate average net recovery by executed disposition channel
```sql
Sort  (cost=24.26..24.66 rows=160 width=194) (actual time=0.033..0.034 rows=5.00 loops=1)
  Output: disposition_executed, (count(outcome_id)), (round(avg(actual_revenue), 2)), (round(avg(actual_cost), 2)), (round(avg(actual_net_recovery), 2)), (round(sum(actual_net_recovery), 2))
  Sort Key: (round(sum(doc.actual_net_recovery), 2)) DESC
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=1
  ->  HashAggregate  (cost=13.60..18.40 rows=160 width=194) (actual time=0.021..0.028 rows=5.00 loops=1)
        Output: disposition_executed, count(outcome_id), round(avg(actual_revenue), 2), round(avg(actual_cost), 2), round(avg(actual_net_recovery), 2), round(sum(actual_net_recovery), 2)
        Group Key: doc.disposition_executed
        Batches: 1  Memory Usage: 32kB
        Buffers: shared hit=1
        ->  Seq Scan on public.decision_outcomes doc  (cost=0.00..11.60 rows=160 width=110) (actual time=0.005..0.006 rows=6.00 loops=1)
              Output: outcome_id, decision_id, disposition_executed, actual_revenue, actual_cost, actual_net_recovery, execution_partner, completion_date, outcome_notes, created_at
              Buffers: shared hit=1
Planning:
  Buffers: shared hit=3
Planning Time: 0.054 ms
Execution Time: 0.052 ms
```

---

### Query R15 [READ]: Calculate total recovered salvage value by liquidation partner
```sql
Sort  (cost=23.46..23.86 rows=160 width=454) (actual time=0.018..0.018 rows=6.00 loops=1)
  Output: (COALESCE(execution_partner, 'Internal Fulfillment / Scrapped'::character varying)), (count(outcome_id)), (round(sum(actual_revenue), 2)), (round(sum(actual_cost), 2)), (round(sum(actual_net_recovery), 2)), execution_partner
  Sort Key: (round(sum(doc.actual_net_recovery), 2)) DESC
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=1
  ->  HashAggregate  (cost=13.60..17.60 rows=160 width=454) (actual time=0.012..0.015 rows=6.00 loops=1)
        Output: COALESCE(execution_partner, 'Internal Fulfillment / Scrapped'::character varying), count(outcome_id), round(sum(actual_revenue), 2), round(sum(actual_cost), 2), round(sum(actual_net_recovery), 2), execution_partner
        Group Key: doc.execution_partner
        Batches: 1  Memory Usage: 32kB
        Buffers: shared hit=1
        ->  Seq Scan on public.decision_outcomes doc  (cost=0.00..11.60 rows=160 width=370) (actual time=0.004..0.004 rows=6.00 loops=1)
              Output: outcome_id, decision_id, disposition_executed, actual_revenue, actual_cost, actual_net_recovery, execution_partner, completion_date, outcome_notes, created_at
              Buffers: shared hit=1
Planning Time: 0.031 ms
Execution Time: 0.030 ms
```

---

### Query R16 [READ]: Calculate average decision confidence score across all decisions
```sql
Aggregate  (cost=1.25..1.27 rows=1 width=112) (actual time=0.017..0.017 rows=1.00 loops=1)
  Output: round(avg(confidence_score), 3), round(min(confidence_score), 3), round(max(confidence_score), 3), count(*) FILTER (WHERE (confidence_score >= 0.800)), count(*) FILTER (WHERE (confidence_score < 0.800))
  Buffers: shared hit=1
  ->  Seq Scan on public.disposition_decisions  (cost=0.00..1.09 rows=9 width=5) (actual time=0.004..0.005 rows=9.00 loops=1)
        Output: decision_id, return_id, recommended_disposition, final_disposition, decided_by_operator_id, is_override, override_reason, confidence_score, decided_at
        Buffers: shared hit=1
Planning:
  Buffers: shared hit=3
Planning Time: 0.046 ms
Execution Time: 0.032 ms
```

---

### Query R17 [READ]: Calculate returns handled by each warehouse facility
```sql
Sort  (cost=24.50..24.85 rows=140 width=458) (actual time=0.072..0.074 rows=4.00 loops=1)
  Output: w.warehouse_id, w.warehouse_code, w.facility_name, w.city, w.capacity, (count(r.return_id)), (count(r.return_id) FILTER (WHERE ((r.status)::text = 'COMPLETED'::text))), (count(r.return_id) FILTER (WHERE (((r.status)::text <> 'COMPLETED'::text) AND ((r.status)::text <> 'CANCELLED'::text)))), (round((((count(r.return_id))::numeric / (w.capacity)::numeric) * '100'::numeric), 2))
  Sort Key: (count(r.return_id)) DESC
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=2
  ->  HashAggregate  (cost=16.36..19.50 rows=140 width=458) (actual time=0.060..0.067 rows=4.00 loops=1)
        Output: w.warehouse_id, w.warehouse_code, w.facility_name, w.city, w.capacity, count(r.return_id), count(r.return_id) FILTER (WHERE ((r.status)::text = 'COMPLETED'::text)), count(r.return_id) FILTER (WHERE (((r.status)::text <> 'COMPLETED'::text) AND ((r.status)::text <> 'CANCELLED'::text))), round((((count(r.return_id))::numeric / (w.capacity)::numeric) * '100'::numeric), 2)
        Group Key: w.warehouse_code
        Batches: 1  Memory Usage: 40kB
        Buffers: shared hit=2
        ->  Hash Left Join  (cost=1.32..13.90 rows=140 width=415) (actual time=0.030..0.037 rows=14.00 loops=1)
              Output: w.warehouse_code, w.warehouse_id, w.facility_name, w.city, w.capacity, r.return_id, r.status
              Hash Cond: (w.warehouse_id = r.warehouse_id)
              Buffers: shared hit=2
              ->  Seq Scan on public.warehouses w  (cost=0.00..11.40 rows=140 width=402) (actual time=0.007..0.008 rows=4.00 loops=1)
                    Output: w.warehouse_id, w.warehouse_code, w.facility_name, w.city, w.state, w.capacity, w.created_at
                    Buffers: shared hit=1
              ->  Hash  (cost=1.14..1.14 rows=14 width=17) (actual time=0.018..0.018 rows=14.00 loops=1)
                    Output: r.return_id, r.status, r.warehouse_id
                    Buckets: 1024  Batches: 1  Memory Usage: 9kB
                    Buffers: shared hit=1
                    ->  Seq Scan on public.returns r  (cost=0.00..1.14 rows=14 width=17) (actual time=0.005..0.009 rows=14.00 loops=1)
                          Output: r.return_id, r.status, r.warehouse_id
                          Buffers: shared hit=1
Planning Time: 0.194 ms
Execution Time: 0.121 ms
```

---

### Query R18 [READ]: Authenticate operator by email (Auth Login query)
```sql
Seq Scan on public.operators  (cost=0.00..10.90 rows=1 width=1117) (actual time=0.017..0.019 rows=1.00 loops=1)
  Output: operator_id, employee_code, full_name, email, password_hash, app_role, warehouse_id, is_active
  Filter: (lower((operators.email)::text) = 'rajesh.sharma@returnloop.internal'::text)
  Rows Removed by Filter: 4
  Buffers: shared hit=1
Planning Time: 0.082 ms
Execution Time: 0.027 ms
```

---

### Query R19 [READ]: Executive Dashboard summary metrics (status counts, revenue, recovery rate)
```sql
Aggregate  (cost=1.59..1.62 rows=1 width=28) (actual time=0.024..0.024 rows=1.00 loops=1)
  Output: (count(*))::integer, (count(*) FILTER (WHERE ((status)::text = 'RECEIVED'::text)))::integer, (count(*) FILTER (WHERE ((status)::text = 'UNDER_INSPECTION'::text)))::integer, (count(*) FILTER (WHERE ((status)::text = 'EVALUATED'::text)))::integer, (count(*) FILTER (WHERE ((status)::text = 'DECIDED'::text)))::integer, (count(*) FILTER (WHERE ((status)::text = 'COMPLETED'::text)))::integer, (count(*) FILTER (WHERE ((status)::text = 'CANCELLED'::text)))::integer
  Buffers: shared hit=1
  ->  Seq Scan on public.returns  (cost=0.00..1.14 rows=14 width=9) (actual time=0.005..0.006 rows=14.00 loops=1)
        Output: return_id, return_tracking_number, product_id, warehouse_id, serial_number, return_reason, return_date, status, customer_comment, created_at
        Buffers: shared hit=1
Planning Time: 0.064 ms
Execution Time: 0.048 ms
```

---

### Query W1 [WRITE]: Insert a new product into master catalog
```sql
Insert on public.products  (cost=0.00..0.02 rows=1 width=800) (actual time=0.161..0.162 rows=1.00 loops=1)
  Output: products.product_id, products.sku, products.model_name, products.retail_price
  Buffers: shared hit=19 dirtied=4
  ->  Result  (cost=0.00..0.02 rows=1 width=800) (actual time=0.069..0.069 rows=1.00 loops=1)
        Output: nextval('products_product_id_seq'::regclass), 'SKU-TEST-PLAN-001'::character varying(50), 'Logitech'::character varying(100), 'MX Master 3S Wireless Mouse'::character varying(150), 'Peripherals'::character varying(50), 8995.00::numeric(10,2), CURRENT_TIMESTAMP
        Buffers: shared hit=15 dirtied=1
Planning:
  Buffers: shared hit=3
Planning Time: 0.032 ms
Execution Time: 0.178 ms
```

---

### Query W2 [WRITE]: Register a new incoming return intake record
```sql
Insert on public.returns  (cost=0.00..0.02 rows=1 width=986) (actual time=0.241..0.242 rows=1.00 loops=1)
  Output: returns.return_id, returns.return_tracking_number, returns.status
  Buffers: shared hit=30 dirtied=8
  ->  Result  (cost=0.00..0.02 rows=1 width=986) (actual time=0.054..0.054 rows=1.00 loops=1)
        Output: nextval('returns_return_id_seq'::regclass), 'RET-2026-PLAN-001'::character varying(50), 1, 1, 'SN-PLAN-TEST-99'::character varying(100), 'Defective upon arrival'::character varying(255), CURRENT_DATE, 'RECEIVED'::character varying(30), 'Device failed initial power-on diagnostics.'::text, CURRENT_TIMESTAMP
        Buffers: shared hit=14 dirtied=1
Planning Time: 0.016 ms
Trigger RI_ConstraintTrigger_c_16977 for constraint fk_returns_product: time=0.154 calls=1
Trigger RI_ConstraintTrigger_c_16982 for constraint fk_returns_warehouse: time=0.054 calls=1
Execution Time: 0.463 ms
```

---

### Query W3 [WRITE]: Record a multi-point technical inspection
```sql
Insert on public.inspections  (cost=0.00..0.02 rows=1 width=246) (actual time=0.188..0.189 rows=1.00 loops=1)
  Output: inspections.inspection_id, inspections.condition_grade, inspections.functional_status, inspections.repair_estimate
  Buffers: shared hit=23 dirtied=5
  ->  Result  (cost=0.00..0.02 rows=1 width=246) (actual time=0.025..0.025 rows=1.00 loops=1)
        Output: nextval('inspections_inspection_id_seq'::regclass), 12, 1, 'Good'::character varying(20), true, true, 'Minor Glitch'::character varying(50), 1200.00::numeric(10,2), 'Firmware recalibration needed; cosmetic casing intact.'::text, CURRENT_TIMESTAMP
        Buffers: shared hit=15 dirtied=1
Planning Time: 0.008 ms
Trigger RI_ConstraintTrigger_c_17012 for constraint fk_inspections_return: time=0.090 calls=1
Trigger RI_ConstraintTrigger_c_17017 for constraint fk_inspections_inspector: time=0.070 calls=1
Execution Time: 0.356 ms
```

---

### Query W4 [WRITE]: Insert an approved disposition decision
```sql
Insert on public.disposition_decisions  (cost=0.00..0.02 rows=1 width=181) (actual time=0.211..0.212 rows=1.00 loops=1)
  Output: disposition_decisions.decision_id, disposition_decisions.return_id, disposition_decisions.final_disposition, disposition_decisions.confidence_score
  Buffers: shared hit=32 dirtied=5
  ->  Result  (cost=0.00..0.02 rows=1 width=181) (actual time=0.028..0.028 rows=1.00 loops=1)
        Output: nextval('disposition_decisions_decision_id_seq'::regclass), 10, 'Resell'::character varying(20), 'Resell'::character varying(20), 1, false, NULL::text, 0.950::numeric(4,3), CURRENT_TIMESTAMP
        Buffers: shared hit=14 dirtied=1
Planning Time: 0.010 ms
Trigger RI_ConstraintTrigger_c_17047 for constraint fk_decisions_return: time=0.104 calls=1
Trigger RI_ConstraintTrigger_c_17052 for constraint fk_decisions_operator: time=0.087 calls=1
Execution Time: 0.416 ms
```

---

### Query W5 [WRITE]: Update return lifecycle status to DECIDED
```sql
Update on public.returns  (cost=0.00..1.18 rows=1 width=84) (actual time=0.102..0.106 rows=1.00 loops=1)
  Output: return_id, return_tracking_number, status
  Buffers: shared hit=11
  ->  Seq Scan on public.returns  (cost=0.00..1.18 rows=1 width=84) (actual time=0.007..0.009 rows=1.00 loops=1)
        Output: 'DECIDED'::character varying(30), ctid
        Filter: (returns.return_id = 1)
        Rows Removed by Filter: 13
        Buffers: shared hit=1
Planning Time: 0.020 ms
Execution Time: 0.347 ms
```

---

### Query W6 [WRITE]: Record an operator override with audit reason
```sql
Update on public.disposition_decisions  (cost=0.00..1.11 rows=1 width=109) (actual time=0.087..0.088 rows=1.00 loops=1)
  Output: decision_id, return_id, recommended_disposition, final_disposition, is_override
  Buffers: shared hit=8
  ->  Seq Scan on public.disposition_decisions  (cost=0.00..1.11 rows=1 width=109) (actual time=0.005..0.006 rows=1.00 loops=1)
        Output: 'Donate'::character varying(20), 1, true, 'Manager authorized corporate donation to local training center.'::text, CURRENT_TIMESTAMP, ctid
        Filter: (disposition_decisions.decision_id = 1)
        Rows Removed by Filter: 8
        Buffers: shared hit=1
Planning Time: 0.032 ms
Execution Time: 0.107 ms
```

---

### Query W7 [WRITE]: Update disposition outcome execution partner & notes
```sql
Update on public.decision_outcomes  (cost=0.14..8.16 rows=1 width=356) (actual time=0.038..0.039 rows=1.00 loops=1)
  Output: outcome_id, execution_partner, outcome_notes
  Buffers: shared hit=5 dirtied=1
  ->  Index Scan using decision_outcomes_pkey on public.decision_outcomes  (cost=0.14..8.16 rows=1 width=356) (actual time=0.009..0.009 rows=1.00 loops=1)
        Output: 'Cashify Certified Platinum Hub'::character varying(150), 'Batch inspection approved with bonus recovery rebate.'::text, ctid
        Index Cond: (decision_outcomes.outcome_id = 1)
        Index Searches: 1
        Buffers: shared hit=2
Planning Time: 0.024 ms
Execution Time: 0.053 ms
```

---

### Query W8 [WRITE]: Record actual financial recovery revenue and processing cost
```sql
Update on public.decision_outcomes  (cost=0.14..8.16 rows=1 width=38) (actual time=0.063..0.063 rows=1.00 loops=1)
  Output: outcome_id, actual_revenue, actual_cost, actual_net_recovery
  Buffers: shared hit=8
  ->  Index Scan using decision_outcomes_pkey on public.decision_outcomes  (cost=0.14..8.16 rows=1 width=38) (actual time=0.006..0.006 rows=1.00 loops=1)
        Output: 65000.00::numeric(10,2), 3500.00::numeric(10,2), ctid
        Index Cond: (decision_outcomes.outcome_id = 1)
        Index Searches: 1
        Buffers: shared hit=2
Planning Time: 0.035 ms
Execution Time: 0.073 ms
```

---

### Query W9 [WRITE]: Controlled deletion of unselected candidate alternative
```sql
Delete on public.decision_alternatives  (cost=0.00..1.81 rows=1 width=6) (actual time=0.104..0.110 rows=1.00 loops=1)
  Output: alternative_id, decision_id, disposition_type, rank_order
  Buffers: shared hit=4 dirtied=2
  ->  Seq Scan on public.decision_alternatives  (cost=0.00..1.81 rows=1 width=6) (actual time=0.004..0.009 rows=1.00 loops=1)
        Output: ctid
        Filter: ((decision_alternatives.decision_id = 1) AND (decision_alternatives.rank_order = 6))
        Rows Removed by Filter: 53
        Buffers: shared hit=1
Planning Time: 0.032 ms
Execution Time: 0.124 ms
```

---

