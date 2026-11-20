# Return Loop — Entity-Relationship (ER) Diagram & Relational Architecture

**Project:** Return Loop (Decision Intelligence Platform for Returned Electronics)  
**Role:** Database Queries & Testing / ER Documentation (Devanshi Kumari)  
**Assignment:** AP CP1  
**Collaboration Note:** Built directly upon the approved Database Design (`dbms/00_database_design.md`) and normalized SQL Schema (`dbms/03_schema.sql`).

---

## 1. Executive Summary & Purpose

The **Return Loop** platform manages the reverse-logistics lifecycle for returned consumer electronics across regional intake fulfillment centers. Upon arrival, returned products undergo multi-point technical inspections to assess physical grade, operational status, and repair viability. An algorithmic decision intelligence engine evaluates multiple disposition options:
1. **Resell** (direct open-box liquidation)
2. **Refurbish** (repair, sanitize, and recertify)
3. **Exchange** (replenish customer warranty replacement pool)
4. **Donate** (educational or charitable distribution)
5. **Recycle** (e-waste scrap and raw material recovery)
6. **Write-off** (operational salvage loss)

This document formalizes the Entity-Relationship (ER) diagram representing the physical and logical database structure implemented in PostgreSQL (v12+). It models eight core entities in strict Third Normal Form (3NF), ensuring ACID compliance, declarative referential integrity, and zero data redundancy.

---

## 2. Visual Entity-Relationship Diagram

A high-resolution, publication-quality Crow's Foot ER diagram has been rendered and committed as an image asset:

![Return Loop Entity-Relationship Diagram](02_er_diagram.png)

*Figure 1: Complete Crow's Foot Entity-Relationship Diagram for Return Loop reverse logistics platform.*

---

## 3. Crow's Foot Notation & Cardinality Grammar

The diagram and underlying relational model adhere strictly to standard **Crow's Foot Notation**:

| Notation Glyph | Cardinality Description | Relational Meaning |
|---|---|---|
| `||` | **Mandatory One (1..1)** | Exactly one parent instance must exist for the child entity. |
| `o|` | **Optional One (0..1)** | Zero or at most one instance can exist (enforced by `UNIQUE` on a nullable or foreign key). |
| `|{` | **Mandatory Many (1..N)** | At least one, but potentially many child instances must exist. |
| `o{` | **Optional Many (0..N)** | Zero, one, or many child instances may exist (standard 1:N foreign key relationship). |

---

## 4. Mermaid Relational Model (Crow's Foot)

Below is the complete text-executable Mermaid ER specification illustrating all entities, attributes, primary keys, foreign keys, and cardinalities:

```mermaid
erDiagram
    products ||--o{ returns : "catalog of (1:N)"
    warehouses ||--o{ returns : "receives (1:N)"
    warehouses ||--|{ operators : "employs (1:N)"
    operators ||--o{ inspections : "certifies (1:N)"
    returns ||--|{ inspections : "undergoes (1:N)"
    returns ||--o| disposition_decisions : "evaluated into (1:1)"
    operators ||--o{ disposition_decisions : "authorizes (1:N)"
    disposition_decisions ||--|{ decision_alternatives : "evaluates (1:N)"
    disposition_decisions ||--o| decision_outcomes : "realizes (1:1)"

    products {
        int product_id PK "SERIAL"
        string sku UK "VARCHAR(50)"
        string brand "VARCHAR(100)"
        string model_name "VARCHAR(150)"
        string category "VARCHAR(50)"
        numeric retail_price "NUMERIC(10,2)"
        timestamptz created_at "DEFAULT NOW()"
    }

    warehouses {
        int warehouse_id PK "SERIAL"
        string warehouse_code UK "VARCHAR(20)"
        string facility_name "VARCHAR(100)"
        string city "VARCHAR(50)"
        string state "VARCHAR(50)"
        int capacity "CHECK (> 0)"
        timestamptz created_at "DEFAULT NOW()"
    }

    operators {
        int operator_id PK "SERIAL"
        string employee_code UK "VARCHAR(20)"
        string full_name "VARCHAR(100)"
        string email UK "VARCHAR(120)"
        string password_hash "VARCHAR(255)"
        string app_role "CHECK (ADMIN, SUPERVISOR, INSPECTOR)"
        string role "VARCHAR(50)"
        int warehouse_id FK "REFERENCES warehouses"
        boolean is_active "DEFAULT TRUE"
        timestamptz created_at "DEFAULT NOW()"
    }

    returns {
        int return_id PK "SERIAL"
        string return_tracking_number UK "VARCHAR(50)"
        int product_id FK "REFERENCES products"
        int warehouse_id FK "REFERENCES warehouses"
        string serial_number "NULLABLE"
        string return_reason "VARCHAR(255)"
        date return_date "DEFAULT CURRENT_DATE"
        string status "CHECK IN pipeline statuses"
        text customer_comment "NULLABLE"
        timestamptz created_at "DEFAULT NOW()"
    }

    inspections {
        int inspection_id PK "SERIAL"
        int return_id FK "REFERENCES returns"
        int inspector_id FK "REFERENCES operators"
        string condition_grade "CHECK (Excellent, Good, Fair, Damaged)"
        boolean has_original_packaging "DEFAULT FALSE"
        boolean has_all_accessories "DEFAULT FALSE"
        string functional_status "CHECK (4 allowed statuses)"
        numeric repair_estimate "CHECK (>= 0)"
        text diagnostic_notes "NULLABLE"
        timestamptz inspected_at "DEFAULT NOW()"
    }

    disposition_decisions {
        int decision_id PK "SERIAL"
        int return_id UK,FK "REFERENCES returns (1:1)"
        string recommended_disposition "CHECK (6 options)"
        string final_disposition "CHECK (6 options)"
        int decided_by_operator_id FK "REFERENCES operators"
        boolean is_override "DEFAULT FALSE"
        text override_reason "CHECK consistency"
        numeric confidence_score "CHECK (0.000 - 1.000)"
        timestamptz decided_at "DEFAULT NOW()"
    }

    decision_alternatives {
        int alternative_id PK "SERIAL"
        int decision_id FK "REFERENCES disposition_decisions"
        string disposition_type "CHECK (6 options)"
        numeric estimated_revenue "CHECK (>= 0)"
        numeric estimated_cost "CHECK (>= 0)"
        numeric net_expected_recovery "GENERATED ALWAYS AS (rev - cost)"
        numeric feasibility_score "CHECK (0.000 - 1.000)"
        int rank_order "CHECK (>= 1)"
        boolean is_recommended "DEFAULT FALSE"
        text rationale "NULLABLE"
        timestamptz created_at "DEFAULT NOW()"
    }

    decision_outcomes {
        int outcome_id PK "SERIAL"
        int decision_id UK,FK "REFERENCES disposition_decisions (1:1)"
        string disposition_executed "CHECK (6 options)"
        numeric actual_revenue "CHECK (>= 0)"
        numeric actual_cost "CHECK (>= 0)"
        numeric actual_net_recovery "GENERATED ALWAYS AS (rev - cost)"
        string execution_partner "VARCHAR(150)"
        date completion_date "DEFAULT CURRENT_DATE"
        text outcome_notes "NULLABLE"
        timestamptz created_at "DEFAULT NOW()"
    }
```

---

## 5. Entity Data Dictionary & Schema Specification

The schema matches the production DDL in `dbms/03_schema.sql` exactly:

### 5.1 `products` (Master Catalog)
* **Purpose:** Serves as the authoritative master catalog for electronic items processed in the reverse supply chain.
* **Primary Key:** `product_id` (`SERIAL`, auto-incrementing integer).
* **Alternate Key:** `sku` (`VARCHAR(50)`, unique stock keeping unit).
* **Attributes:** `brand`, `model_name`, `category`, `retail_price` (NUMERIC >= 0), `created_at`.
* **Integrity:** `ON DELETE RESTRICT` protects catalog entries from deletion if active returns reference them.

### 5.2 `warehouses` (Logistics Intake Facilities)
* **Purpose:** Physical facilities where customer returns are delivered, staged, triaged, and dispatched.
* **Primary Key:** `warehouse_id` (`SERIAL`).
* **Alternate Key:** `warehouse_code` (`VARCHAR(20)`, unique identifier e.g. `WH-DEL-01`).
* **Attributes:** `facility_name`, `city`, `state`, `capacity` (INT > 0), `created_at`.
* **Integrity:** `ON DELETE RESTRICT` protects facility records from deletion if referenced by operators or returns.

### 5.3 `operators` (Diagnostic Specialists & Triage Supervisors)
* **Purpose:** Authorized personnel performing inspections, condition grading, and disposition determinations.
* **Primary Key:** `operator_id` (`SERIAL`).
* **Alternate Keys:** `employee_code` (`VARCHAR(20)`), `email` (`VARCHAR(120)`).
* **Foreign Key:** `warehouse_id` references `warehouses(warehouse_id)` on delete `RESTRICT`.
* **Attributes:** `full_name`, `password_hash`, `app_role` (`ADMIN`, `SUPERVISOR`, `INSPECTOR`), `role`, `is_active`, `created_at`.

### 5.4 `returns` (Return Intake Transactions)
* **Purpose:** Core transaction unit tracking a customer return package through its reverse logistics lifecycle.
* **Primary Key:** `return_id` (`SERIAL`).
* **Alternate Key:** `return_tracking_number` (`VARCHAR(50)`, unique identifier e.g. `RET-2026-0001`).
* **Foreign Keys:**
  - `product_id` references `products(product_id)` on delete `RESTRICT`.
  - `warehouse_id` references `warehouses(warehouse_id)` on delete `RESTRICT`.
* **Attributes:** `serial_number`, `return_reason`, `return_date`, `status` (`RECEIVED`, `UNDER_INSPECTION`, `EVALUATED`, `DECIDED`, `COMPLETED`, `CANCELLED`), `customer_comment`, `created_at`.

### 5.5 `inspections` (Multi-Point Diagnostic Records)
* **Purpose:** Multi-point diagnostic assessment capturing condition grade, completeness, and estimated repair cost.
* **Primary Key:** `inspection_id` (`SERIAL`).
* **Foreign Keys:**
  - `return_id` references `returns(return_id)` on delete `CASCADE`.
  - `inspector_id` references `operators(operator_id)` on delete `RESTRICT`.
* **Attributes:** `condition_grade` (`Excellent`, `Good`, `Fair`, `Damaged`), `has_original_packaging`, `has_all_accessories`, `functional_status` (`Fully Functional`, `Minor Glitch`, `Defective Hardware`, `Non-functional`), `repair_estimate` (>= 0), `diagnostic_notes`, `inspected_at`.

### 5.6 `disposition_decisions` (Decision Intelligence Decisions)
* **Purpose:** The algorithmically recommended and supervisor-authorized disposition path for a returned unit.
* **Primary Key:** `decision_id` (`SERIAL`).
* **Foreign Keys & Constraints:**
  - `return_id` references `returns(return_id)` on delete `CASCADE`, enforced as **strictly 1:1** via `UNIQUE(return_id)`.
  - `decided_by_operator_id` references `operators(operator_id)` on delete `RESTRICT`.
* **Attributes:** `recommended_disposition`, `final_disposition`, `is_override`, `override_reason` (enforced by CHECK constraint when `is_override = TRUE`), `confidence_score` (between 0.000 and 1.000), `decided_at`.

### 5.7 `decision_alternatives` (Evaluated Candidate Pathways)
* **Purpose:** Candidate disposition alternatives scored and ranked by the decision engine for a given decision.
* **Primary Key:** `alternative_id` (`SERIAL`).
* **Foreign Key:** `decision_id` references `disposition_decisions(decision_id)` on delete `CASCADE`.
* **Composite Candidate Keys:** `UNIQUE(decision_id, disposition_type)`, `UNIQUE(decision_id, rank_order)`.
* **Attributes:** `disposition_type`, `estimated_revenue`, `estimated_cost`, `net_expected_recovery` (`GENERATED ALWAYS AS (estimated_revenue - estimated_cost) STORED`), `feasibility_score` (0.000 to 1.000), `rank_order` (>= 1), `is_recommended`, `rationale`, `created_at`.

### 5.8 `decision_outcomes` (Financial & Operational Recovery Execution)
* **Purpose:** Post-execution actual financial recovery realized upon liquidation, refurbishing, recycling, or salvage.
* **Primary Key:** `outcome_id` (`SERIAL`).
* **Foreign Key & Constraints:** `decision_id` references `disposition_decisions(decision_id)` on delete `RESTRICT`, enforced as **strictly 1:1** via `UNIQUE(decision_id)`.
* **Attributes:** `disposition_executed`, `actual_revenue`, `actual_cost`, `actual_net_recovery` (`GENERATED ALWAYS AS (actual_revenue - actual_cost) STORED`), `execution_partner`, `completion_date`, `outcome_notes`, `created_at`.

---

## 6. Relational Cardinality & Integrity Analysis

### 6.1 One-to-Many Relationships (1 : N)
1. **`products` (1) to `returns` (0..N):**  
   One catalog SKU can be returned zero or multiple times. A return references exactly one master product (`product_id`).
2. **`warehouses` (1) to `returns` (0..N):**  
   A reverse fulfillment warehouse receives many return packages over time. Each return is routed to exactly one intake warehouse (`warehouse_id`).
3. **`warehouses` (1) to `operators` (1..N):**  
   A logistics center employs a team of technicians and supervisors. Every operator is assigned to a home warehouse (`warehouse_id`).
4. **`returns` (1) to `inspections` (1..N):**  
   A return may undergo initial intake inspection and subsequent specialized diagnostics. Every inspection belongs to one return (`return_id`).
5. **`operators` (1) to `inspections` (0..N):**  
   An operator certifies many inspections. Each inspection record logs the certifying inspector (`inspector_id`).
6. **`operators` (1) to `disposition_decisions` (0..N):**  
   A triage supervisor authorizes or overrides multiple decisions. Every decision records the authorizer (`decided_by_operator_id`).
7. **`disposition_decisions` (1) to `decision_alternatives` (1..N):**  
   Every decision evaluates multiple candidate channels (typically 2 to 6 ranked options). Each alternative belongs to one decision (`decision_id`).

### 6.2 One-to-One Relationships (1 : 1)
1. **`returns` (1) to `disposition_decisions` (0..1):**  
   A return reaches a single final disposition decision. This 1:1 relationship is enforced by `UNIQUE(return_id)` on `disposition_decisions`.
2. **`disposition_decisions` (1) to `decision_outcomes` (0..1):**  
   A finalized decision leads to at most one executed real-world recovery outcome. This 1:1 relationship is enforced by `UNIQUE(decision_id)` on `decision_outcomes`.

### 6.3 Many-to-Many (M : N) Associations
* **`returns` and `operators`:**  
   Formally an M:N associative pattern resolved through `inspections` (multiple operators may perform diagnostic tests on a given return, and one operator inspects many returns) and `disposition_decisions` (operators review decisions on multiple returns).

---

## 7. Coordination & Schema Alignment Certification

This ER documentation and accompanying visual diagram have been verified against:
- **Database Architecture Document:** `dbms/00_database_design.md`
- **Physical Schema DDL:** `dbms/03_schema.sql`
- **Initial Seed Dataset:** `dbms/04_seed.sql`

All table names, column identifiers, foreign-key linkages, and check constraints match the approved schema with 100% fidelity.
