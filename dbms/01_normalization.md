# Return Loop — Relational Database Normalization Analysis

**Project:** Return Loop (Decision Intelligence Platform for Returned Electronics)  
**Role:** Database Normalization Documentation  
**Contributor:** Devanshi Kumari  
**Assignment:** AP CP1  
**Collaboration Reference:** Coordinated with Database Architecture (`dbms/00_database_design.md`), SQL Schema (`dbms/02_schema.sql`), and ER Documentation (`dbms/03_er_diagram.md`).

---

## 1. Executive Summary & Purpose

In reverse logistics and electronics asset recovery, operations frequently begin with ad-hoc flat spreadsheets or unified intake logs. Such denormalized structures inevitably suffer from severe data redundancy, inconsistent data representations, and operational anomalies (insertion, update, and deletion anomalies).

This document provides a formal, mathematically rigorous normalization analysis for the **Return Loop** database. It tracks the step-by-step transformation of raw, unnormalized reverse logistics data (**UNF**) through **First Normal Form (1NF)**, **Second Normal Form (2NF)**, **Third Normal Form (3NF)**, and evaluates compliance with **Boyce-Codd Normal Form (BCNF)**.

The resulting schema consists of **eight relations** that guarantee:
1. **Zero update anomalies:** Attribute values are stored in exactly one canonical relation.
2. **Lossless-join decomposition:** All original relations can be reconstructed without spurious tuples.
3. **Dependency preservation:** All operational constraints and functional dependencies are enforced directly through table keys and declarative foreign keys without cross-table assertions.

---

## 2. Unnormalized Form (UNF) & Relational Anomalies

### 2.1 The Hypothetical Unnormalized Relation (`RETURN_LOG_UNF`)

Consider a flat intake record where a single row captures the customer return, warehouse facility, inspecting technician, product catalog details, multi-point inspection items, multiple disposition options, authorized decision, and finalized financial outcome:

$$\text{RETURN\_LOG\_UNF} = \{ \underline{\text{tracking\_number}}, \text{product\_sku}, \text{product\_brand}, \text{model\_name}, \text{category}, \text{retail\_price},$$
$$\text{warehouse\_code}, \text{facility\_name}, \text{city}, \text{state}, \text{capacity}, \text{operator\_code}, \text{operator\_name}, \text{operator\_email},$$
$$\text{return\_reason}, \text{return\_date}, \text{status}, \{\text{inspection\_pass}, \text{condition\_grade}, \text{repair\_est}, \text{diagnostic\_notes}\},$$
$$\text{recommended\_disp}, \text{final\_disp}, \text{is\_override}, \text{override\_reason}, \text{confidence\_score},$$
$$\{\text{disp\_type}, \text{est\_rev}, \text{est\_cost}, \text{feasibility\_score}, \text{rank}\}, \text{executed\_disp}, \text{actual\_rev}, \text{actual\_cost}, \text{partner}, \text{completion\_date} \}$$

*Note: Attributes enclosed in curly braces $\{ \dots \}$ represent repeating groups or multi-valued fields.*

### 2.2 Operational Anomalies in UNF

1. **Insertion Anomaly:**
   - A retailer cannot onboard a newly launched electronic product (e.g., `PlayStation 5 Slim`) into the catalog until a customer actually returns one.
   - A new regional warehouse hub (e.g., `WH-HYD-01`) cannot be registered without receiving a return package.
   - An newly hired technician cannot be registered in the system without performing an inspection or decision.

2. **Update Anomaly:**
   - If Apple revises the MSRP of the `iPhone 14 (128GB)`, thousands of historical return log rows containing `product_sku = 'SKU-APPL-IPH14-128'` must be individually updated. Any missed update creates conflicting price data across past returns.
   - If a warehouse facility relocates or updates its storage capacity, the update must be performed across every return event ever processed at that facility.

3. **Deletion Anomaly:**
   - If an erroneous return record is purged from the database, the master product catalog specifications, warehouse location data, and technician employee profile are permanently erased if that was the only return associated with them.

---

## 3. First Normal Form (1NF)

### 3.1 Definition & Requirements
A relation $R$ is in **First Normal Form (1NF)** if and only if:
1. Every attribute domain contains strictly **atomic (indivisible) scalar values**.
2. There are **no repeating groups** or multi-valued arrays.
3. Each record is uniquely identifiable by a well-defined **Primary Key**.

### 3.2 1NF Decomposition Steps
1. **Elimination of Repeating Groups:**
   - The multi-point inspection passes are extracted into an independent `inspections` relation linked by `return_id`.
   - The candidate disposition alternatives evaluated by the scoring algorithm are extracted into an independent `decision_alternatives` relation linked by `decision_id`.
2. **Atomicity Enforcement:**
   - Multi-valued customer notes, accessory checklists, and comma-separated flags are split into discrete boolean attributes (`has_original_packaging`, `has_all_accessories`) and normalized scalar text fields.
3. **Primary Key Assignment:**
   - Each decomposed relation receives an atomic surrogate primary key (`product_id`, `warehouse_id`, `operator_id`, `return_id`, `inspection_id`, `decision_id`, `alternative_id`, `outcome_id`).

### 3.3 State at 1NF
At 1NF, all data is tabular and flat, but partial dependencies on composite keys still threaten relational integrity.

---

## 4. Second Normal Form (2NF)

### 4.1 Definition & Requirements
A relation $R$ is in **Second Normal Form (2NF)** if and only if:
1. The relation satisfies **First Normal Form (1NF)**.
2. Every **non-prime attribute** is **fully functionally dependent** on the primary key, meaning no non-prime attribute exhibits a **partial functional dependency** on a proper subset of any candidate key.

### 4.2 Partial Functional Dependency Analysis & Elimination
Partial dependencies occur when a composite candidate key exists, and certain non-key attributes depend on only part of that key:

$$\text{In a composite relation } \{\underline{\text{return\_id}}, \underline{\text{product\_sku}}, \text{model\_name}, \text{retail\_price}, \text{return\_reason}\}:$$
- Composite Key: $\{\text{return\_id}, \text{product\_sku}\}$
- Dependency 1: $\{\text{return\_id}, \text{product\_sku}\} \rightarrow \text{return\_reason}$ (Full dependency)
- Dependency 2: $\{\text{product\_sku}\} \rightarrow \{\text{model\_name}, \text{retail\_price}\}$ (**Partial dependency on proper subset**)

### 4.3 2NF Decomposition Result
To satisfy 2NF:
- Extract `products` into its own table with key `product_id`.
- In `decision_alternatives`, where candidate keys are composite ($\{\text{decision\_id}, \text{disposition\_type}\}$ and $\{\text{decision\_id}, \text{rank\_order}\}$), every non-prime attribute (`estimated_revenue`, `estimated_cost`, `feasibility_score`, `rationale`) requires the full candidate key for identification.
- Relations with single-attribute primary keys (`returns`, `warehouses`, `operators`, `inspections`, `disposition_decisions`, `decision_outcomes`) automatically satisfy 2NF because no proper subset of the primary key exists.

---

## 5. Third Normal Form (3NF)

### 5.1 Definition & Requirements
A relation $R$ is in **Third Normal Form (3NF)** if and only if:
1. The relation satisfies **Second Normal Form (2NF)**.
2. No non-prime attribute is **transitively dependent** on any candidate key.

Formally, for every non-trivial functional dependency $X \rightarrow Y$:
- $X$ is a **superkey** of $R$, **OR**
- $Y$ is a **prime attribute** (a member of some candidate key of $R$).

### 5.2 Transitive Dependency Identification & Elimination

#### Case 1: Warehouse Location Transitivity in `returns`
$$\text{If returns embedded warehouse details: } \{\text{return\_id}\} \rightarrow \{\text{warehouse\_id}\} \rightarrow \{\text{city}, \text{state}, \text{capacity}\}$$
- $\{\text{warehouse\_id}\}$ is not a candidate key of `returns`.
- Attributes `city`, `state`, and `capacity` depend transitively on `return_id` through `warehouse_id`.
- **3NF Resolution:** Separate `warehouses` into an independent relation:
  $$\text{warehouses}(\underline{\text{warehouse\_id}}, \text{warehouse\_code}, \text{facility\_name}, \text{city}, \text{state}, \text{capacity})$$
  $$\text{returns}(\underline{\text{return\_id}}, \dots, \text{warehouse\_id}^{\text{FK}})$$

#### Case 2: Technician Profile Transitivity in `inspections`
$$\text{If inspections embedded technician details: } \{\text{inspection\_id}\} \rightarrow \{\text{inspector\_id}\} \rightarrow \{\text{full\_name}, \text{email}, \text{role}\}$$
- $\{\text{inspector\_id}\}$ is not a candidate key of `inspections`.
- **3NF Resolution:** Separate `operators` into an independent relation:
  $$\text{operators}(\underline{\text{operator\_id}}, \text{employee\_code}, \text{full\_name}, \text{email}, \text{role}, \text{warehouse\_id}^{\text{FK}}, \text{is\_active})$$
  $$\text{inspections}(\underline{\text{inspection\_id}}, \text{return\_id}^{\text{FK}}, \text{inspector\_id}^{\text{FK}}, \dots)$$

#### Case 3: Algorithmic Alternatives Transitivity in `disposition_decisions`
$$\text{If decisions embedded multi-channel scores: } \{\text{decision\_id}\} \rightarrow \{\text{alternative scores and rank}\}$$
- Denormalizing alternative rankings causes repeating attributes and transitive calculations.
- **3NF Resolution:** Isolate candidate options into `decision_alternatives`.

---

## 6. Boyce-Codd Normal Form (BCNF) Analysis

### 6.1 BCNF Definition
A relation $R$ is in **Boyce-Codd Normal Form (BCNF)** if and only if for every non-trivial functional dependency $X \rightarrow Y$:
- **$X$ is a superkey of $R$.**

BCNF is stricter than 3NF because it does not allow the relaxation where $Y$ is a prime attribute.

### 6.2 Formal BCNF Verification by Relation

| Relation Name | Determinant ($X$) | Dependent ($Y$) | Is $X$ a Superkey? | Normal Form Evaluation |
|---|---|---|:---:|---|
| **`products`** | `{product_id}` | `{sku, brand, model_name, category, retail_price}` | **YES** (PK) | Satisfies BCNF |
| | `{sku}` | `{product_id, brand, model_name, category, retail_price}` | **YES** (Unique AK) | Satisfies BCNF |
| **`warehouses`** | `{warehouse_id}` | `{warehouse_code, facility_name, city, state, capacity}` | **YES** (PK) | Satisfies BCNF |
| | `{warehouse_code}` | `{warehouse_id, facility_name, city, state, capacity}` | **YES** (Unique AK) | Satisfies BCNF |
| **`operators`** | `{operator_id}` | `{employee_code, full_name, email, role, warehouse_id, is_active}` | **YES** (PK) | Satisfies BCNF |
| | `{employee_code}` | `{operator_id, full_name, email, role, warehouse_id, is_active}` | **YES** (Unique AK) | Satisfies BCNF |
| | `{email}` | `{operator_id, employee_code, full_name, role, warehouse_id, is_active}` | **YES** (Unique AK) | Satisfies BCNF |
| **`returns`** | `{return_id}` | `{return_tracking_number, product_id, warehouse_id, serial_number, return_reason, return_date, status, customer_comment}` | **YES** (PK) | Satisfies BCNF |
| | `{return_tracking_number}` | `{return_id, product_id, warehouse_id, serial_number, return_reason, return_date, status, customer_comment}` | **YES** (Unique AK) | Satisfies BCNF |
| **`inspections`** | `{inspection_id}` | `{return_id, inspector_id, condition_grade, has_original_packaging, has_all_accessories, functional_status, repair_estimate, diagnostic_notes}` | **YES** (PK) | Satisfies BCNF |
| **`disposition_decisions`** | `{decision_id}` | `{return_id, recommended_disposition, final_disposition, decided_by_operator_id, is_override, override_reason, confidence_score}` | **YES** (PK) | Satisfies BCNF |
| | `{return_id}` | `{decision_id, recommended_disposition, final_disposition, decided_by_operator_id, is_override, override_reason, confidence_score}` | **YES** (Unique AK) | Satisfies BCNF |
| **`decision_alternatives`** | `{alternative_id}` | `{decision_id, disposition_type, estimated_revenue, estimated_cost, net_expected_recovery, feasibility_score, rank_order, is_recommended, rationale}` | **YES** (PK) | Satisfies BCNF |
| | `{decision_id, disposition_type}` | `{alternative_id, estimated_revenue, estimated_cost, net_expected_recovery, feasibility_score, rank_order, is_recommended, rationale}` | **YES** (Composite AK) | Satisfies BCNF |
| | `{decision_id, rank_order}` | `{alternative_id, disposition_type, estimated_revenue, estimated_cost, net_expected_recovery, feasibility_score, is_recommended, rationale}` | **YES** (Composite AK) | Satisfies BCNF |
| **`decision_outcomes`** | `{outcome_id}` | `{decision_id, disposition_executed, actual_revenue, actual_cost, actual_net_recovery, execution_partner, completion_date, outcome_notes}` | **YES** (PK) | Satisfies BCNF |
| | `{decision_id}` | `{outcome_id, disposition_executed, actual_revenue, actual_cost, actual_net_recovery, execution_partner, completion_date, outcome_notes}` | **YES** (Unique AK) | Satisfies BCNF |

**Conclusion:** In every single relation of the Return Loop schema, **every determinant is a candidate key**. Therefore, the entire database schema achieves **Boyce-Codd Normal Form (BCNF)**.

---

## 7. Mathematical Properties of the Decomposition

### 7.1 Lossless-Join Decomposition (Heath's Theorem)
A decomposition of relation $R$ into $R_1$ and $R_2$ is lossless with respect to a set of functional dependencies $F$ if and only if:

$$(R_1 \cap R_2) \rightarrow R_1 \quad \text{OR} \quad (R_1 \cap R_2) \rightarrow R_2$$

In the Return Loop schema:
- Decomposing `returns` and `products`:
  $$\text{returns} \cap \text{products} = \{\text{product\_id}\}$$
  Since $\{\text{product\_id}\}$ is the primary key of `products`, $\{\text{product\_id}\} \rightarrow \text{products}$ holds. Thus, $\text{returns} \bowtie \text{products}$ is **strictly lossless**.
- Decomposing `returns` and `warehouses`:
  $$\text{returns} \cap \text{warehouses} = \{\text{warehouse\_id}\}$$
  Since $\{\text{warehouse\_id}\}$ is the primary key of `warehouses`, this decomposition is **lossless**.
- Decomposing `disposition_decisions` and `decision_alternatives`:
  $$\text{disposition\_decisions} \cap \text{decision\_alternatives} = \{\text{decision\_id}\}$$
  Since $\{\text{decision\_id}\}$ is the primary key of `disposition_decisions`, this decomposition is **lossless**.

By induction over all decomposed pairs, the entire database schema decomposition is **lossless**.

### 7.2 Dependency Preservation
A decomposition $D = \{R_1, R_2, \dots, R_k\}$ preserves a set of functional dependencies $F$ if:

$$\left( \bigcup_{i=1}^k \pi_{R_i}(F) \right)^+ = F^+$$

Every functional dependency in the Return Loop reverse logistics domain can be verified within a single physical table using standard declarative primary key (`PRIMARY KEY`), alternate key (`UNIQUE`), check (`CHECK`), or foreign key (`FOREIGN KEY`) constraints without requiring inter-relation triggers or assertions. Therefore, the decomposition is **fully dependency-preserving**.

---

## 8. Summary Normalization Matrix

| Table Name | 1NF | 2NF | 3NF | BCNF | Primary Key | Alternate Unique Keys |
|---|:---:|:---:|:---:|:---:|---|---|
| `products` | ✅ | ✅ | ✅ | ✅ | `product_id` | `sku` |
| `warehouses` | ✅ | ✅ | ✅ | ✅ | `warehouse_id` | `warehouse_code` |
| `operators` | ✅ | ✅ | ✅ | ✅ | `operator_id` | `employee_code`, `email` |
| `returns` | ✅ | ✅ | ✅ | ✅ | `return_id` | `return_tracking_number` |
| `inspections` | ✅ | ✅ | ✅ | ✅ | `inspection_id` | None |
| `disposition_decisions` | ✅ | ✅ | ✅ | ✅ | `decision_id` | `return_id` |
| `decision_alternatives` | ✅ | ✅ | ✅ | ✅ | `alternative_id` | `(decision_id, disposition_type)`, `(decision_id, rank_order)` |
| `decision_outcomes` | ✅ | ✅ | ✅ | ✅ | `outcome_id` | `decision_id` |

---

## 9. Academic Certification

This document confirms that the Return Loop database architecture is normalized to **Third Normal Form (3NF)** and complies with **Boyce-Codd Normal Form (BCNF)**. The design completely eliminates update anomalies, supports lossless joins across reverse supply-chain operations, and guarantees data integrity for production deployment.
