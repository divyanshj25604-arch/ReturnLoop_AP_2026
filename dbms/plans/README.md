# Return Loop — PostgreSQL Query Execution Plans (EXPLAIN ANALYZE)

**Database:** PostgreSQL 17.11 (`returnloop_db`)  
**Command:** `EXPLAIN (ANALYZE, BUFFERS, TIMING)`  
**Total Plans Generated:** 26  

---

### Q1 (A.1: All Returned Products)
```sql
Sort  (cost=25.57..25.77 rows=80 width=980) (actual time=0.102..0.105 rows=14 loops=1)
  Sort Key: r.return_id
  Sort Method: quicksort  Memory: 26kB
  Buffers: shared hit=5
  ->  Hash Join  (cost=12.03..23.05 rows=80 width=980) (actual time=0.057..0.064 rows=14 loops=1)
        Hash Cond: (r.product_id = p.product_id)
        Buffers: shared hit=2
        ->  Seq Scan on returns r  (cost=0.00..10.80 rows=80 width=208) (actual time=0.016..0.018 rows=14 loops=1)
              Buffers: shared hit=1
        ->  Hash  (cost=10.90..10.90 rows=90 width=776) (actual time=0.024..0.024 rows=10 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 10kB
              Buffers: shared hit=1
              ->  Seq Scan on products p  (cost=0.00..10.90 rows=90 width=776) (actual time=0.006..0.007 rows=10 loops=1)
                    Buffers: shared hit=1
Planning:
  Buffers: shared hit=205
Planning Time: 0.817 ms
Execution Time: 0.162 ms
```

---

### Q2 (A.2: Returns by Condition - Damaged)
```sql
Sort  (cost=35.15..35.16 rows=4 width=838) (actual time=0.076..0.077 rows=2 loops=1)
  Sort Key: i.repair_estimate DESC
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=5
  ->  Hash Join  (cost=23.08..35.11 rows=4 width=838) (actual time=0.057..0.064 rows=2 loops=1)
        Hash Cond: (r.product_id = p.product_id)
        Buffers: shared hit=3
        ->  Hash Join  (cost=11.05..23.06 rows=4 width=74) (actual time=0.029..0.035 rows=2 loops=1)
              Hash Cond: (r.return_id = i.return_id)
              Buffers: shared hit=2
              ->  Seq Scan on returns r  (cost=0.00..10.80 rows=80 width=42) (actual time=0.007..0.008 rows=14 loops=1)
                    Buffers: shared hit=1
              ->  Hash  (cost=11.00..11.00 rows=4 width=40) (actual time=0.013..0.013 rows=2 loops=1)
                    Buckets: 1024  Batches: 1  Memory Usage: 9kB
                    Buffers: shared hit=1
                    ->  Seq Scan on inspections i  (cost=0.00..11.00 rows=4 width=40) (actual time=0.006..0.008 rows=2 loops=1)
                          Filter: (condition_grade = 'Damaged'::condition_grade_enum)
                          Rows Removed by Filter: 8
                          Buffers: shared hit=1
        ->  Hash  (cost=10.90..10.90 rows=90 width=776) (actual time=0.019..0.019 rows=10 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 10kB
              Buffers: shared hit=1
              ->  Seq Scan on products p  (cost=0.00..10.90 rows=90 width=776) (actual time=0.004..0.006 rows=10 loops=1)
                    Buffers: shared hit=1
Planning:
  Buffers: shared hit=215
Planning Time: 0.950 ms
Execution Time: 0.125 ms
```

---

### Q3 (A.3: Returns by Warehouse - WH-DEL-01)
```sql
Sort  (cost=22.37..22.42 rows=20 width=284) (actual time=0.062..0.064 rows=5 loops=1)
  Sort Key: r.return_date DESC
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=4
  ->  Hash Join  (cost=1.06..21.93 rows=20 width=284) (actual time=0.036..0.043 rows=5 loops=1)
        Hash Cond: (r.warehouse_id = w.warehouse_id)
        Buffers: shared hit=2
        ->  Seq Scan on returns r  (cost=0.00..19.80 rows=80 width=68) (actual time=0.014..0.017 rows=14 loops=1)
              Buffers: shared hit=1
        ->  Hash  (cost=1.05..1.05 rows=1 width=220) (actual time=0.014..0.014 rows=1 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 9kB
              Buffers: shared hit=1
              ->  Seq Scan on warehouses w  (cost=0.00..1.05 rows=1 width=220) (actual time=0.007..0.008 rows=1 loops=1)
                    Filter: (warehouse_code = 'WH-DEL-01'::text)
                    Rows Removed by Filter: 3
                    Buffers: shared hit=1
Planning:
  Buffers: shared hit=8
Planning Time: 0.280 ms
Execution Time: 0.098 ms
```

---

### Q4 (A.4: Pending Disposition Decisions)
```sql
Sort  (cost=35.15..35.25 rows=40 width=852) (actual time=0.082..0.084 rows=4 loops=1)
  Sort Key: r.return_date
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=5
  ->  Hash Join  (cost=23.23..34.09 rows=40 width=852) (actual time=0.053..0.064 rows=4 loops=1)
        Hash Cond: (r.product_id = p.product_id)
        Buffers: shared hit=3
        ->  Hash Anti Join  (cost=11.20..22.02 rows=40 width=88) (actual time=0.029..0.037 rows=4 loops=1)
              Hash Cond: (r.return_id = dd.return_id)
              Buffers: shared hit=2
              ->  Seq Scan on returns r  (cost=0.00..10.80 rows=80 width=88) (actual time=0.007..0.010 rows=13 loops=1)
                    Filter: (status <> 'CANCELLED'::return_status_enum)
                    Rows Removed by Filter: 1
                    Buffers: shared hit=1
              ->  Hash  (cost=10.00..10.00 rows=10 width=4) (actual time=0.013..0.013 rows=10 loops=1)
                    Buckets: 1024  Batches: 1  Memory Usage: 9kB
                    Buffers: shared hit=1
                    ->  Seq Scan on disposition_decisions dd  (cost=0.00..10.00 rows=10 width=4) (actual time=0.004..0.006 rows=10 loops=1)
                          Buffers: shared hit=1
        ->  Hash  (cost=10.90..10.90 rows=90 width=776) (actual time=0.015..0.015 rows=10 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 10kB
              Buffers: shared hit=1
              ->  Seq Scan on products p  (cost=0.00..10.90 rows=90 width=776) (actual time=0.003..0.005 rows=10 loops=1)
                    Buffers: shared hit=1
Planning:
  Buffers: shared hit=8
Planning Time: 0.380 ms
Execution Time: 0.128 ms
```

---

### Q5 (A.5: Completed Returns)
```sql
Sort  (cost=45.90..45.92 rows=6 width=860) (actual time=0.089..0.091 rows=6 loops=1)
  Sort Key: doc.completion_date DESC
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=6
  ->  Hash Join  (cost=33.80..45.82 rows=6 width=860) (actual time=0.065..0.075 rows=6 loops=1)
        Hash Cond: (r.product_id = p.product_id)
        Buffers: shared hit=4
        ->  Hash Join  (cost=21.78..33.78 rows=6 width=96) (actual time=0.043..0.051 rows=6 loops=1)
              Hash Cond: (dd.decision_id = doc.decision_id)
              Buffers: shared hit=3
              ->  Hash Join  (cost=10.72..22.70 rows=6 width=50) (actual time=0.027..0.033 rows=6 loops=1)
                    Hash Cond: (dd.return_id = r.return_id)
                    Buffers: shared hit=2
                    ->  Seq Scan on disposition_decisions dd  (cost=0.00..10.90 rows=90 width=32) (actual time=0.007..0.009 rows=10 loops=1)
                          Buffers: shared hit=1
                    ->  Hash  (cost=10.65..10.65 rows=6 width=22) (actual time=0.012..0.012 rows=6 loops=1)
                          Buckets: 1024  Batches: 1  Memory Usage: 9kB
                          Buffers: shared hit=1
                          ->  Seq Scan on returns r  (cost=0.00..10.65 rows=6 width=22) (actual time=0.004..0.006 rows=6 loops=1)
                                Filter: (status = 'COMPLETED'::return_status_enum)
                                Rows Removed by Filter: 8
                                Buffers: shared hit=1
              ->  Hash  (cost=10.06..10.06 rows=6 width=50) (actual time=0.010..0.010 rows=6 loops=1)
                    Buckets: 1024  Batches: 1  Memory Usage: 9kB
                    Buffers: shared hit=1
                    ->  Seq Scan on decision_outcomes doc  (cost=0.00..10.06 rows=6 width=50) (actual time=0.003..0.004 rows=6 loops=1)
                          Buffers: shared hit=1
        ->  Hash  (cost=10.90..10.90 rows=90 width=776) (actual time=0.015..0.015 rows=10 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 10kB
              Buffers: shared hit=1
              ->  Seq Scan on products p  (cost=0.00..10.90 rows=90 width=776) (actual time=0.003..0.005 rows=10 loops=1)
                    Buffers: shared hit=1
Planning:
  Buffers: shared hit=10
Planning Time: 0.520 ms
Execution Time: 0.140 ms
```

---

### Q6 (B.1: Join Returns with Products)
```sql
Sort  (cost=25.57..25.77 rows=80 width=858) (actual time=0.057..0.059 rows=14 loops=1)
  Sort Key: r.return_id
  Sort Method: quicksort  Memory: 26kB
  Buffers: shared hit=4
  ->  Hash Join  (cost=12.03..23.05 rows=80 width=858) (actual time=0.033..0.039 rows=14 loops=1)
        Hash Cond: (r.product_id = p.product_id)
        Buffers: shared hit=2
        ->  Seq Scan on returns r  (cost=0.00..10.80 rows=80 width=88) (actual time=0.008..0.010 rows=14 loops=1)
              Buffers: shared hit=1
        ->  Hash  (cost=10.90..10.90 rows=90 width=776) (actual time=0.015..0.015 rows=10 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 10kB
              Buffers: shared hit=1
              ->  Seq Scan on products p  (cost=0.00..10.90 rows=90 width=776) (actual time=0.003..0.005 rows=10 loops=1)
                    Buffers: shared hit=1
Planning:
  Buffers: shared hit=8
Planning Time: 0.233 ms
Execution Time: 0.088 ms
```

---

### Q7 (B.2: Join Returns with Inspections)
```sql
Sort  (cost=24.57..24.62 rows=20 width=98) (actual time=0.057..0.059 rows=10 loops=1)
  Sort Key: r.return_id
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=4
  ->  Hash Join  (cost=11.80..23.14 rows=20 width=98) (actual time=0.033..0.040 rows=10 loops=1)
        Hash Cond: (r.return_id = i.return_id)
        Buffers: shared hit=2
        ->  Seq Scan on returns r  (cost=0.00..10.80 rows=80 width=22) (actual time=0.008..0.009 rows=14 loops=1)
              Buffers: shared hit=1
        ->  Hash  (cost=11.55..11.55 rows=20 width=80) (actual time=0.016..0.016 rows=10 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 9kB
              Buffers: shared hit=1
              ->  Seq Scan on inspections i  (cost=0.00..11.55 rows=20 width=80) (actual time=0.003..0.006 rows=10 loops=1)
                    Buffers: shared hit=1
Planning:
  Buffers: shared hit=8
Planning Time: 0.240 ms
Execution Time: 0.090 ms
```

---

### Q8 (B.3: Join Returns with Warehouses)
```sql
Sort  (cost=24.57..24.77 rows=80 width=284) (actual time=0.061..0.063 rows=14 loops=1)
  Sort Key: r.return_id
  Sort Method: quicksort  Memory: 26kB
  Buffers: shared hit=4
  ->  Hash Join  (cost=1.09..22.05 rows=80 width=284) (actual time=0.035..0.042 rows=14 loops=1)
        Hash Cond: (r.warehouse_id = w.warehouse_id)
        Buffers: shared hit=2
        ->  Seq Scan on returns r  (cost=0.00..19.80 rows=80 width=68) (actual time=0.015..0.017 rows=14 loops=1)
              Buffers: shared hit=1
        ->  Hash  (cost=1.04..1.04 rows=4 width=220) (actual time=0.011..0.011 rows=4 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 9kB
              Buffers: shared hit=1
              ->  Seq Scan on warehouses w  (cost=0.00..1.04 rows=4 width=220) (actual time=0.004..0.005 rows=4 loops=1)
                    Buffers: shared hit=1
Planning:
  Buffers: shared hit=8
Planning Time: 0.225 ms
Execution Time: 0.092 ms
```

---

### Q9 (B.4: Join Returns with Disposition Decisions)
```sql
Sort  (cost=24.57..24.62 rows=20 width=164) (actual time=0.061..0.063 rows=10 loops=1)
  Sort Key: dd.decision_id
  Sort Method: quicksort  Memory: 26kB
  Buffers: shared hit=4
  ->  Hash Join  (cost=11.80..23.14 rows=20 width=164) (actual time=0.035..0.043 rows=10 loops=1)
        Hash Cond: (dd.return_id = r.return_id)
        Buffers: shared hit=2
        ->  Seq Scan on disposition_decisions dd  (cost=0.00..11.00 rows=100 width=146) (actual time=0.013..0.016 rows=10 loops=1)
              Buffers: shared hit=1
        ->  Hash  (cost=10.80..10.80 rows=80 width=22) (actual time=0.013..0.013 rows=14 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 9kB
              Buffers: shared hit=1
              ->  Seq Scan on returns r  (cost=0.00..10.80 rows=80 width=22) (actual time=0.003..0.005 rows=14 loops=1)
                    Buffers: shared hit=1
Planning:
  Buffers: shared hit=8
Planning Time: 0.230 ms
Execution Time: 0.095 ms
```

---

### Q10 (B.5: Join Decisions with Alternatives)
```sql
Sort  (cost=30.65..30.72 rows=27 width=88) (actual time=0.090..0.093 rows=30 loops=1)
  Sort Key: dd.decision_id, da.rank_order
  Sort Method: quicksort  Memory: 27kB
  Buffers: shared hit=4
  ->  Hash Join  (cost=12.25..29.98 rows=27 width=88) (actual time=0.045..0.058 rows=30 loops=1)
        Hash Cond: (da.decision_id = dd.decision_id)
        Buffers: shared hit=2
        ->  Seq Scan on decision_alternatives da  (cost=0.00..16.70 rows=70 width=68) (actual time=0.015..0.021 rows=30 loops=1)
              Buffers: shared hit=1
        ->  Hash  (cost=11.00..11.00 rows=100 width=24) (actual time=0.017..0.017 rows=10 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 9kB
              Buffers: shared hit=1
              ->  Seq Scan on disposition_decisions dd  (cost=0.00..11.00 rows=100 width=24) (actual time=0.004..0.007 rows=10 loops=1)
                    Buffers: shared hit=1
Planning:
  Buffers: shared hit=8
Planning Time: 0.270 ms
Execution Time: 0.125 ms
```

---

### Q11 (B.6: Join Decisions with Outcomes)
```sql
Sort  (cost=21.46..21.48 rows=6 width=128) (actual time=0.055..0.057 rows=6 loops=1)
  Sort Key: doc.outcome_id
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=4
  ->  Hash Join  (cost=10.14..21.38 rows=6 width=128) (actual time=0.033..0.040 rows=6 loops=1)
        Hash Cond: (dd.decision_id = doc.decision_id)
        Buffers: shared hit=2
        ->  Seq Scan on disposition_decisions dd  (cost=0.00..11.00 rows=100 width=24) (actual time=0.007..0.010 rows=10 loops=1)
              Buffers: shared hit=1
        ->  Hash  (cost=10.06..10.06 rows=6 width=108) (actual time=0.016..0.016 rows=6 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 9kB
              Buffers: shared hit=1
              ->  Seq Scan on decision_outcomes doc  (cost=0.00..10.06 rows=6 width=108) (actual time=0.004..0.006 rows=6 loops=1)
                    Buffers: shared hit=1
Planning:
  Buffers: shared hit=8
Planning Time: 0.245 ms
Execution Time: 0.088 ms
```

---

### Q12 (C.1: Count Returns by Condition)
```sql
Sort  (cost=24.58..24.63 rows=20 width=88) (actual time=0.076..0.078 rows=4 loops=1)
  Sort Key: (count(r.return_id)) DESC
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=4
  ->  HashAggregate  (cost=23.85..24.15 rows=20 width=88) (actual time=0.057..0.063 rows=4 loops=1)
        Group Key: i.condition_grade
        Batches: 1  Memory Usage: 24kB
        Buffers: shared hit=2
        ->  Hash Join  (cost=11.80..23.55 rows=20 width=40) (actual time=0.029..0.036 rows=10 loops=1)
              Hash Cond: (r.return_id = i.return_id)
              Buffers: shared hit=2
              ->  Seq Scan on returns r  (cost=0.00..10.80 rows=80 width=4) (actual time=0.008..0.009 rows=14 loops=1)
                    Buffers: shared hit=1
              ->  Hash  (cost=11.55..11.55 rows=20 width=40) (actual time=0.012..0.012 rows=10 loops=1)
                    Buckets: 1024  Batches: 1  Memory Usage: 9kB
                    Buffers: shared hit=1
                    ->  Seq Scan on inspections i  (cost=0.00..11.55 rows=20 width=40) (actual time=0.003..0.005 rows=10 loops=1)
                          Buffers: shared hit=1
Planning:
  Buffers: shared hit=8
Planning Time: 0.287 ms
Execution Time: 0.120 ms
```

---

### Q13 (C.2: Count Returns by Disposition)
```sql
Sort  (cost=12.28..12.33 rows=20 width=52) (actual time=0.046..0.048 rows=4 loops=1)
  Sort Key: (count(dd.decision_id)) DESC
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=3
  ->  HashAggregate  (cost=11.50..11.80 rows=20 width=52) (actual time=0.030..0.034 rows=4 loops=1)
        Group Key: dd.final_disposition
        Batches: 1  Memory Usage: 24kB
        Buffers: shared hit=1
        ->  Seq Scan on disposition_decisions dd  (cost=0.00..11.00 rows=100 width=27) (actual time=0.008..0.011 rows=10 loops=1)
              Buffers: shared hit=1
Planning:
  Buffers: shared hit=8
Planning Time: 0.190 ms
Execution Time: 0.080 ms
```

---

### Q14 (C.3: Average Recovery by Channel)
```sql
Sort  (cost=10.22..10.24 rows=6 width=84) (actual time=0.042..0.043 rows=3 loops=1)
  Sort Key: (round(avg(doc.actual_net_recovery), 2)) DESC
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=3
  ->  HashAggregate  (cost=10.11..10.17 rows=6 width=84) (actual time=0.026..0.030 rows=3 loops=1)
        Group Key: doc.disposition_executed
        Batches: 1  Memory Usage: 24kB
        Buffers: shared hit=1
        ->  Seq Scan on decision_outcomes doc  (cost=0.00..10.06 rows=6 width=48) (actual time=0.008..0.010 rows=6 loops=1)
              Buffers: shared hit=1
Planning:
  Buffers: shared hit=8
Planning Time: 0.205 ms
Execution Time: 0.075 ms
```

---

### Q15 (C.4: Total Recovered Value by Partner)
```sql
Sort  (cost=10.37..10.38 rows=7 width=148) (actual time=0.046..0.048 rows=5 loops=1)
  Sort Key: (sum(doc.actual_net_recovery)) DESC NULLS LAST
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=3
  ->  MixedAggregate  (cost=0.00..10.27 rows=7 width=148) (actual time=0.026..0.033 rows=5 loops=1)
        Hash Key: doc.execution_partner
        Group Key: ()
        Batches: 1  Memory Usage: 24kB
        Buffers: shared hit=1
        ->  Seq Scan on decision_outcomes doc  (cost=0.00..10.06 rows=6 width=80) (actual time=0.008..0.010 rows=6 loops=1)
              Buffers: shared hit=1
Planning:
  Buffers: shared hit=8
Planning Time: 0.230 ms
Execution Time: 0.085 ms
```

---

### Q16 (C.5: Average Decision Confidence)
```sql
Sort  (cost=12.28..12.33 rows=20 width=68) (actual time=0.042..0.044 rows=4 loops=1)
  Sort Key: (round(avg(dd.confidence_score), 4)) DESC
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=3
  ->  HashAggregate  (cost=11.50..11.80 rows=20 width=68) (actual time=0.026..0.030 rows=4 loops=1)
        Group Key: dd.recommended_disposition
        Batches: 1  Memory Usage: 24kB
        Buffers: shared hit=1
        ->  Seq Scan on disposition_decisions dd  (cost=0.00..11.00 rows=100 width=26) (actual time=0.007..0.010 rows=10 loops=1)
              Buffers: shared hit=1
Planning:
  Buffers: shared hit=8
Planning Time: 0.200 ms
Execution Time: 0.076 ms
```

---

### Q17 (C.6: Returns Handled by Warehouse)
```sql
Sort  (cost=23.32..23.33 rows=4 width=252) (actual time=0.076..0.078 rows=4 loops=1)
  Sort Key: (count(r.return_id)) DESC
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=4
  ->  HashAggregate  (cost=23.18..23.28 rows=4 width=252) (actual time=0.058..0.063 rows=4 loops=1)
        Group Key: w.warehouse_id, w.warehouse_code, w.facility_name, w.city
        Batches: 1  Memory Usage: 24kB
        Buffers: shared hit=2
        ->  Hash Right Join  (cost=1.09..23.00 rows=80 width=164) (actual time=0.027..0.035 rows=14 loops=1)
              Hash Cond: (r.warehouse_id = w.warehouse_id)
              Buffers: shared hit=2
              ->  Seq Scan on returns r  (cost=0.00..19.80 rows=80 width=26) (actual time=0.008..0.010 rows=14 loops=1)
                    Buffers: shared hit=1
              ->  Hash  (cost=1.04..1.04 rows=4 width=146) (actual time=0.010..0.010 rows=4 loops=1)
                    Buckets: 1024  Batches: 1  Memory Usage: 9kB
                    Buffers: shared hit=1
                    ->  Seq Scan on warehouses w  (cost=0.00..1.04 rows=4 width=146) (actual time=0.003..0.005 rows=4 loops=1)
                          Buffers: shared hit=1
Planning:
  Buffers: shared hit=8
Planning Time: 0.280 ms
Execution Time: 0.118 ms
```

---

### Q18 (D.1: Insert Product)
```sql
Insert on products  (cost=0.00..0.01 rows=1 width=780) (actual time=0.315..0.316 rows=1 loops=1)
  Buffers: shared hit=10 dirtied=4
  ->  Result  (cost=0.00..0.01 rows=1 width=780) (actual time=0.001..0.002 rows=1 loops=1)
Planning Time: 0.045 ms
Execution Time: 0.380 ms
```

---

### Q19 (D.2: Register Return)
```sql
Insert on returns  (cost=10.90..10.92 rows=1 width=1116) (actual time=0.350..0.352 rows=1 loops=1)
  Buffers: shared hit=14 dirtied=5
  InitPlan 1
    ->  Seq Scan on products  (cost=0.00..10.90 rows=1 width=4) (actual time=0.012..0.013 rows=1 loops=1)
          Filter: (sku = 'SKU-SONY-PS5SLIM'::text)
          Rows Removed by Filter: 10
          Buffers: shared hit=1
  ->  Result  (cost=0.00..0.01 rows=1 width=1116) (actual time=0.020..0.021 rows=1 loops=1)
        Buffers: shared hit=1
Planning Time: 0.085 ms
Execution Time: 0.420 ms
```

---

### Q20 (D.3: Record Inspection)
```sql
Insert on inspections  (cost=10.80..10.82 rows=1 width=110) (actual time=0.310..0.311 rows=1 loops=1)
  Buffers: shared hit=12 dirtied=4
  InitPlan 1
    ->  Seq Scan on returns  (cost=0.00..10.80 rows=1 width=4) (actual time=0.011..0.012 rows=1 loops=1)
          Filter: (return_tracking_number = 'RET-2026-0015'::text)
          Rows Removed by Filter: 14
          Buffers: shared hit=1
  ->  Result  (cost=0.00..0.01 rows=1 width=110) (actual time=0.018..0.019 rows=1 loops=1)
        Buffers: shared hit=1
Planning Time: 0.080 ms
Execution Time: 0.375 ms
```

---

### Q21 (D.4: Insert Disposition Decision)
```sql
Insert on disposition_decisions  (cost=10.80..10.82 rows=1 width=64) (actual time=0.320..0.322 rows=1 loops=1)
  Buffers: shared hit=13 dirtied=4
  InitPlan 1
    ->  Seq Scan on returns  (cost=0.00..10.80 rows=1 width=4) (actual time=0.011..0.012 rows=1 loops=1)
          Filter: (return_tracking_number = 'RET-2026-0015'::text)
          Rows Removed by Filter: 14
          Buffers: shared hit=1
  ->  Result  (cost=0.00..0.01 rows=1 width=64) (actual time=0.018..0.019 rows=1 loops=1)
        Buffers: shared hit=1
Planning Time: 0.085 ms
Execution Time: 0.390 ms
```

---

### Q22 (E.1: Update Return Status)
```sql
Update on returns  (cost=0.00..10.80 rows=1 width=214) (actual time=0.180..0.182 rows=1 loops=1)
  Buffers: shared hit=11 dirtied=3
  ->  Seq Scan on returns  (cost=0.00..10.80 rows=1 width=214) (actual time=0.015..0.017 rows=1 loops=1)
        Filter: (return_tracking_number = 'RET-2026-0015'::text)
        Rows Removed by Filter: 14
        Buffers: shared hit=1
Planning:
  Buffers: shared hit=7
Planning Time: 0.220 ms
Execution Time: 0.225 ms
```

---

### Q23 (E.2: Record Operator Override)
```sql
Update on disposition_decisions  (cost=0.14..8.16 rows=1 width=432) (actual time=0.180..0.182 rows=1 loops=1)
  Buffers: shared hit=12 dirtied=4
  ->  Index Scan using disposition_decisions_pkey on disposition_decisions  (cost=0.14..8.16 rows=1 width=432) (actual time=0.021..0.023 rows=1 loops=1)
        Index Cond: (decision_id = 8)
        Buffers: shared hit=2
Planning:
  Buffers: shared hit=17
Planning Time: 0.440 ms
Execution Time: 0.222 ms
```

---

### Q24 (E.3: Update Disposition Outcome)
```sql
Update on decision_outcomes  (cost=0.14..8.16 rows=1 width=248) (actual time=0.150..0.152 rows=1 loops=1)
  Buffers: shared hit=10 dirtied=3
  ->  Index Scan using decision_outcomes_pkey on decision_outcomes  (cost=0.14..8.16 rows=1 width=248) (actual time=0.018..0.020 rows=1 loops=1)
        Index Cond: (outcome_id = 2)
        Buffers: shared hit=2
Planning:
  Buffers: shared hit=16
Planning Time: 0.395 ms
Execution Time: 0.190 ms
```

---

### Q25 (E.4: Record Actual Recovery)
```sql
Update on decision_outcomes  (cost=0.14..8.16 rows=1 width=118) (actual time=0.160..0.162 rows=1 loops=1)
  Buffers: shared hit=11 dirtied=3
  ->  Index Scan using decision_outcomes_pkey on decision_outcomes  (cost=0.14..8.16 rows=1 width=118) (actual time=0.018..0.020 rows=1 loops=1)
        Index Cond: (outcome_id = 2)
        Buffers: shared hit=2
Planning:
  Buffers: shared hit=16
Planning Time: 0.390 ms
Execution Time: 0.205 ms
```

---

### Q26 (F.1: Controlled Alternative Deletion)
```sql
Delete on decision_alternatives  (cost=0.00..1.44 rows=1 width=6) (actual time=0.125..0.126 rows=1 loops=1)
  Buffers: shared hit=6 dirtied=3
  ->  Seq Scan on decision_alternatives  (cost=0.00..1.44 rows=1 width=6) (actual time=0.024..0.027 rows=1 loops=1)
        Filter: ((decision_id = 1) AND (rank_order = 3))
        Rows Removed by Filter: 26
        Buffers: shared hit=1
Planning:
  Buffers: shared hit=12
Planning Time: 0.355 ms
Execution Time: 0.165 ms
```
