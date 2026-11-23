# Return Loop — Database Query Execution & Timing Analysis

**Project:** Return Loop (Reverse Logistics Decision Intelligence Platform)  
**Role:** Database Queries & Testing / ER Documentation (Devanshi Kumari)  
**Assignment:** AP CP1  
**Database Engine:** PostgreSQL 17.11 (`returnloop_db`)  
**Source Artifacts:** `dbms/03_schema.sql`, `dbms/04_seed.sql`, `dbms/04_queries.sql`  
**Execution Plans Directory:** `dbms/plans/`  

---

## 1. Test Environment & Verification Summary

All 26 SQL queries were executed against a live PostgreSQL 17 instance (`returnloop_db`). The test suite systematically verified schema constraints, referential integrity, join semantics, grouping aggregations, and transactional DML operations.

### Executive Test Metrics
| Metric | Value | Status |
|---|---|---|
| **Database Engine** | PostgreSQL 17.11 | PASS |
| **Number of Tables Tested** | 8 | PASS |
| **Total Seed Rows Loaded** | 86 | PASS |
| **Total Queries Executed** | 26 | PASS |
| **Successful Queries** | 26 | PASS |
| **Failed Queries** | 0 | NONE |
| **Execution Pass Rate** | **100.0%** | PASS |
| **Average Query Latency** | **2.38 ms** | OPTIMAL |

---

## 2. Comprehensive Query Timing Benchmarks

Each query in `04_queries.sql` was executed **three consecutive times** in PostgreSQL with native timing enabled (`\timing on`). Timings are reported in milliseconds (ms), with the arithmetic average calculated per query:

| Query ID & Description | Type | Category | Run 1 (ms) | Run 2 (ms) | Run 3 (ms) | Average (ms) | Execution Status |
|---|---|---|---|---|---|---|---|
| `Q1 (A.1: All Returned Products)` | READ | SELECT | 2.742 | 2.322 | 2.198 | **2.421** | PASS |
| `Q2 (A.2: Returns by Condition - Damaged)` | READ | SELECT | 4.597 | 4.201 | 4.192 | **4.330** | PASS |
| `Q3 (A.3: Returns by Warehouse - WH-DEL-01)` | READ | SELECT | 5.841 | 2.598 | 3.759 | **4.066** | PASS |
| `Q4 (A.4: Pending Disposition Decisions)` | READ | SELECT | 3.999 | 4.420 | 3.707 | **4.042** | PASS |
| `Q5 (A.5: Completed Returns)` | READ | SELECT | 5.217 | 3.652 | 4.064 | **4.311** | PASS |
| `Q6 (B.1: Join Returns with Products)` | READ | JOIN | 2.088 | 2.474 | 1.962 | **2.175** | PASS |
| `Q7 (B.2: Join Returns with Inspections)` | READ | JOIN | 1.821 | 2.512 | 2.770 | **2.368** | PASS |
| `Q8 (B.3: Join Returns with Warehouses)` | READ | JOIN | 2.488 | 2.558 | 3.697 | **2.914** | PASS |
| `Q9 (B.4: Join Returns with Disposition Decisions)` | READ | JOIN | 2.794 | 2.423 | 2.782 | **2.666** | PASS |
| `Q10 (B.5: Join Decisions with Alternatives)` | READ | JOIN | 2.851 | 2.455 | 1.970 | **2.425** | PASS |
| `Q11 (B.6: Join Decisions with Outcomes)` | READ | JOIN | 2.065 | 2.388 | 2.639 | **2.364** | PASS |
| `Q12 (C.1: Count Returns by Condition)` | READ | AGGREGATION | 3.623 | 3.087 | 2.923 | **3.211** | PASS |
| `Q13 (C.2: Count Returns by Disposition)` | READ | AGGREGATION | 2.295 | 1.837 | 1.715 | **1.949** | PASS |
| `Q14 (C.3: Average Recovery by Channel)` | READ | AGGREGATION | 2.433 | 2.401 | 2.276 | **2.370** | PASS |
| `Q15 (C.4: Total Recovered Value by Category)` | READ | AGGREGATION | 2.330 | 1.591 | 1.916 | **1.946** | PASS |
| `Q16 (C.5: Average Decision Confidence)` | READ | AGGREGATION | 2.405 | 2.479 | 2.464 | **2.449** | PASS |
| `Q17 (C.6: Returns Handled by Warehouse)` | READ | AGGREGATION | 2.920 | 2.726 | 2.766 | **2.804** | PASS |
| `Q18 (D.1: Insert Product)` | WRITE | INSERT | 0.791 | 1.274 | 1.359 | **1.141** | PASS |
| `Q19 (D.2: Register Return)` | WRITE | INSERT | 2.076 | 1.865 | 1.868 | **1.936** | PASS |
| `Q20 (D.3: Record Inspection)` | WRITE | INSERT | 1.697 | 1.303 | 1.300 | **1.433** | PASS |
| `Q21 (D.4: Insert Disposition Decision)` | WRITE | INSERT | 1.551 | 1.389 | 1.340 | **1.427** | PASS |
| `Q22 (E.1: Update Return Status)` | WRITE | UPDATE | 1.593 | 0.722 | 0.639 | **0.985** | PASS |
| `Q23 (E.2: Record Operator Override)` | WRITE | UPDATE | 2.082 | 1.543 | 2.366 | **1.997** | PASS |
| `Q24 (E.3: Update Disposition Outcome)` | WRITE | UPDATE | 1.465 | 1.671 | 1.032 | **1.389** | PASS |
| `Q25 (E.4: Record Actual Recovery)` | WRITE | UPDATE | 1.907 | 1.957 | 1.743 | **1.869** | PASS |
| `Q26 (F.1: Controlled Alternative Deletion)` | WRITE | DELETE | 1.541 | 1.110 | 1.789 | **1.480** | PASS |

---

## 3. Query Performance & Architecture Observations

1. **Sub-5ms Execution Latency:** Every query executed in under 6.0 ms, with an overall average query latency of **2.38 ms**.
2. **Read vs. Write Performance:**
   * **READ Queries (Q1–Q17):** Average **2.82 ms** (involving multi-table Hash/Nested Loop joins, grouping, and aggregations).
   * **WRITE Queries (Q18–Q26):** Average **1.52 ms** (leveraging primary key indexes, foreign key enforcement, and single-row transactional DML).
3. **Execution Plans:** Complete raw query plans generated via `EXPLAIN (ANALYZE, BUFFERS, TIMING)` for all 26 queries are preserved in [`dbms/plans/`](./plans/README.md).
