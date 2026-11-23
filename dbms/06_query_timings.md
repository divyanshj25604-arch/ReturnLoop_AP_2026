# Return Loop — Database Query Execution & Timing Analysis

**Project:** Return Loop (Reverse Logistics Decision Intelligence Platform)  
**Role:** Database Queries & Testing / ER Documentation (Devanshi Kumari)  
**Assignment:** AP CP1  
**Database Engine:** PostgreSQL (returnloop_db)  
**Source Artifacts:** `dbms/03_schema.sql`, `dbms/04_seed.sql`, `dbms/05_queries.sql`  

---

## 1. Test Environment & Verification Summary

All 26 queries defined in `dbms/05_queries.sql` were executed against a live PostgreSQL instance (`returnloop_db`).

### Executive Test Metrics
| Metric | Value | Status |
|---|---|---|
| **Database Engine** | PostgreSQL | PASS |
| **Number of Tables Tested** | 8 | PASS |
| **Total Queries Executed** | 26 | PASS |
| **Successful Queries** | 26 | PASS |
| **Failed Queries** | 0 | NONE |
| **Execution Pass Rate** | **100.0%** | PASS |
| **Average Query Latency** | **2.03 ms** | OPTIMAL |

---

## 2. Query Timing Benchmarks (3 Consecutive Runs)

| Query ID & Description | Category | Run 1 (ms) | Run 2 (ms) | Run 3 (ms) | Average (ms) | Execution Status |
|---|---|---|---|---|---|---|
| `Q1 (A.1: All Returned Products)` | SELECT | 3.050 | 2.460 | 2.762 | **2.757** | PASS |
| `Q2 (A.2: Returns by Condition - Damaged)` | SELECT | 4.338 | 3.441 | 3.138 | **3.639** | PASS |
| `Q3 (A.3: Returns by Warehouse - WH-DEL-01)` | SELECT | 2.545 | 2.231 | 2.976 | **2.584** | PASS |
| `Q4 (A.4: Pending Disposition Decisions)` | SELECT | 3.652 | 3.170 | 3.175 | **3.332** | PASS |
| `Q5 (A.5: Completed Returns)` | SELECT | 4.003 | 3.233 | 3.155 | **3.464** | PASS |
| `Q6 (B.1: Join Returns with Products)` | JOIN | 1.695 | 2.337 | 2.445 | **2.159** | PASS |
| `Q7 (B.2: Join Returns with Inspections)` | JOIN | 2.445 | 1.957 | 2.128 | **2.177** | PASS |
| `Q8 (B.3: Join Returns with Warehouses)` | JOIN | 2.133 | 3.156 | 1.668 | **2.319** | PASS |
| `Q9 (B.4: Join Returns with Disposition Decisions)` | JOIN | 2.217 | 1.611 | 1.696 | **1.841** | PASS |
| `Q10 (B.5: Join Decisions with Alternatives)` | JOIN | 2.341 | 1.719 | 1.550 | **1.870** | PASS |
| `Q11 (B.6: Join Decisions with Outcomes)` | JOIN | 1.388 | 1.597 | 1.668 | **1.551** | PASS |
| `Q12 (C.1: Count Returns by Condition)` | AGGREGATION | 2.426 | 2.537 | 2.310 | **2.424** | PASS |
| `Q13 (C.2: Count Returns by Disposition)` | AGGREGATION | 1.801 | 2.463 | 2.554 | **2.273** | PASS |
| `Q14 (C.3: Average Recovery by Channel)` | AGGREGATION | 1.614 | 1.755 | 2.421 | **1.930** | PASS |
| `Q15 (C.4: Total Recovered Value by Partner)` | AGGREGATION | 2.915 | 2.612 | 2.686 | **2.738** | PASS |
| `Q16 (C.5: Average Decision Confidence)` | AGGREGATION | 1.784 | 1.274 | 1.720 | **1.593** | PASS |
| `Q17 (C.6: Returns Handled by Warehouse)` | AGGREGATION | 2.935 | 3.071 | 3.663 | **3.223** | PASS |
| `Q18 (D.1: Insert Product)` | INSERT | 0.838 | 0.650 | 0.765 | **0.751** | PASS |
| `Q19 (D.2: Register Return)` | INSERT | 1.380 | 1.407 | 1.188 | **1.325** | PASS |
| `Q20 (D.3: Record Inspection)` | INSERT | 1.290 | 0.918 | 0.935 | **1.048** | PASS |
| `Q21 (D.4: Insert Disposition Decision)` | INSERT | 1.095 | 1.258 | 1.042 | **1.132** | PASS |
| `Q22 (E.1: Update Return Status)` | UPDATE | 0.551 | 0.642 | 0.533 | **0.575** | PASS |
| `Q23 (E.2: Record Operator Override)` | UPDATE | 2.406 | 1.757 | 1.834 | **1.999** | PASS |
| `Q24 (E.3: Update Disposition Outcome)` | UPDATE | 1.201 | 1.391 | 1.304 | **1.299** | PASS |
| `Q25 (E.4: Record Actual Recovery)` | UPDATE | 1.163 | 1.817 | 1.450 | **1.477** | PASS |
| `Q26 (F.1: Controlled Alternative Deletion)` | DELETE | 1.309 | 1.561 | 1.374 | **1.415** | PASS |
