-- ============================================================================
-- Return Loop — Relational Database Schema
-- Project: Return Loop (Decision Intelligence Platform for Returned Electronics)
-- Role: Database Architect (Shreyansh Rathaur)
-- Assignment: AP CP1
-- Target Engine: PostgreSQL (v12+)
-- Standards: 3NF Relational Integrity, ACID Compliance, Declarative Constraints
-- ============================================================================

-- Clean up existing tables in reverse dependency order for idempotency
DROP TABLE IF EXISTS decision_outcomes CASCADE;
DROP TABLE IF EXISTS decision_alternatives CASCADE;
DROP TABLE IF EXISTS disposition_decisions CASCADE;
DROP TABLE IF EXISTS inspections CASCADE;
DROP TABLE IF EXISTS returns CASCADE;
DROP TABLE IF EXISTS operators CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Enable pgcrypto extension for cryptographic functions (password hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Table: products
-- Master catalog of electronic products handled by the reverse logistics pipeline.
-- ----------------------------------------------------------------------------
CREATE TABLE products (
    product_id          SERIAL PRIMARY KEY,
    sku                 VARCHAR(50) NOT NULL,
    brand               VARCHAR(100) NOT NULL,
    model_name          VARCHAR(150) NOT NULL,
    category            VARCHAR(50) NOT NULL,
    retail_price        NUMERIC(10, 2) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_products_sku UNIQUE (sku),
    CONSTRAINT chk_products_retail_price CHECK (retail_price >= 0.00)
);

-- ----------------------------------------------------------------------------
-- 2. Table: warehouses
-- Physical fulfillment hubs and reverse logistics intake facilities.
-- ----------------------------------------------------------------------------
CREATE TABLE warehouses (
    warehouse_id        SERIAL PRIMARY KEY,
    warehouse_code      VARCHAR(20) NOT NULL,
    facility_name       VARCHAR(100) NOT NULL,
    city                VARCHAR(50) NOT NULL,
    state               VARCHAR(50) NOT NULL,
    capacity            INT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_warehouses_code UNIQUE (warehouse_code),
    CONSTRAINT chk_warehouses_capacity CHECK (capacity > 0)
);

-- ----------------------------------------------------------------------------
-- 3. Table: operators
-- Technicians, inspection specialists, and triage decision supervisors.
-- ----------------------------------------------------------------------------
CREATE TABLE operators (
    operator_id         SERIAL PRIMARY KEY,
    employee_code       VARCHAR(20) NOT NULL,
    full_name           VARCHAR(100) NOT NULL,
    email               VARCHAR(120) NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    app_role            VARCHAR(20) NOT NULL DEFAULT 'INSPECTOR',
    role                VARCHAR(50) NOT NULL,
    warehouse_id        INT NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_operators_employee_code UNIQUE (employee_code),
    CONSTRAINT uq_operators_email UNIQUE (email),
    CONSTRAINT chk_operators_app_role CHECK (
        app_role IN ('ADMIN', 'SUPERVISOR', 'INSPECTOR')
    ),
    CONSTRAINT fk_operators_warehouse
        FOREIGN KEY (warehouse_id)
        REFERENCES warehouses (warehouse_id)
        ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- 4. Table: returns
-- Customer return transactions received at intake facilities.
-- ----------------------------------------------------------------------------
CREATE TABLE returns (
    return_id               SERIAL PRIMARY KEY,
    return_tracking_number  VARCHAR(50) NOT NULL,
    product_id              INT NOT NULL,
    warehouse_id            INT NOT NULL,
    serial_number           VARCHAR(100),
    return_reason           VARCHAR(255) NOT NULL,
    return_date             DATE NOT NULL DEFAULT CURRENT_DATE,
    status                  VARCHAR(30) NOT NULL DEFAULT 'RECEIVED',
    customer_comment        TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_returns_tracking_number UNIQUE (return_tracking_number),
    CONSTRAINT fk_returns_product
        FOREIGN KEY (product_id)
        REFERENCES products (product_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_returns_warehouse
        FOREIGN KEY (warehouse_id)
        REFERENCES warehouses (warehouse_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_returns_status CHECK (
        status IN ('RECEIVED', 'UNDER_INSPECTION', 'EVALUATED', 'DECIDED', 'COMPLETED', 'CANCELLED')
    )
);

-- ----------------------------------------------------------------------------
-- 5. Table: inspections
-- Technical, diagnostic, and cosmetic assessments on returned products.
-- ----------------------------------------------------------------------------
CREATE TABLE inspections (
    inspection_id           SERIAL PRIMARY KEY,
    return_id               INT NOT NULL,
    inspector_id            INT NOT NULL,
    condition_grade         VARCHAR(20) NOT NULL,
    has_original_packaging  BOOLEAN NOT NULL DEFAULT FALSE,
    has_all_accessories     BOOLEAN NOT NULL DEFAULT FALSE,
    functional_status       VARCHAR(50) NOT NULL,
    repair_estimate         NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    diagnostic_notes        TEXT,
    inspected_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_inspections_return
        FOREIGN KEY (return_id)
        REFERENCES returns (return_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_inspections_inspector
        FOREIGN KEY (inspector_id)
        REFERENCES operators (operator_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_inspections_condition_grade CHECK (
        condition_grade IN ('Excellent', 'Good', 'Fair', 'Damaged')
    ),
    CONSTRAINT chk_inspections_functional_status CHECK (
        functional_status IN ('Fully Functional', 'Minor Glitch', 'Defective Hardware', 'Non-functional')
    ),
    CONSTRAINT chk_inspections_repair_estimate CHECK (repair_estimate >= 0.00)
);

-- ----------------------------------------------------------------------------
-- 6. Table: disposition_decisions
-- Decision intelligence recommendation and final authorized disposition.
-- ----------------------------------------------------------------------------
CREATE TABLE disposition_decisions (
    decision_id             SERIAL PRIMARY KEY,
    return_id               INT NOT NULL,
    recommended_disposition VARCHAR(20) NOT NULL,
    final_disposition       VARCHAR(20) NOT NULL,
    decided_by_operator_id  INT NOT NULL,
    is_override             BOOLEAN NOT NULL DEFAULT FALSE,
    override_reason         TEXT,
    confidence_score        NUMERIC(4, 3) NOT NULL,
    decided_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_decisions_return UNIQUE (return_id),
    CONSTRAINT fk_decisions_return
        FOREIGN KEY (return_id)
        REFERENCES returns (return_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_decisions_operator
        FOREIGN KEY (decided_by_operator_id)
        REFERENCES operators (operator_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_decisions_recommended_disposition CHECK (
        recommended_disposition IN ('Resell', 'Refurbish', 'Exchange', 'Donate', 'Recycle', 'Write-off')
    ),
    CONSTRAINT chk_decisions_final_disposition CHECK (
        final_disposition IN ('Resell', 'Refurbish', 'Exchange', 'Donate', 'Recycle', 'Write-off')
    ),
    CONSTRAINT chk_decisions_confidence_score CHECK (
        confidence_score >= 0.000 AND confidence_score <= 1.000
    ),
    CONSTRAINT chk_decisions_override_consistency CHECK (
        is_override = FALSE OR (is_override = TRUE AND override_reason IS NOT NULL AND length(trim(override_reason)) > 0)
    )
);

-- ----------------------------------------------------------------------------
-- 7. Table: decision_alternatives
-- Candidate disposition options evaluated by the decision intelligence engine.
-- ----------------------------------------------------------------------------
CREATE TABLE decision_alternatives (
    alternative_id          SERIAL PRIMARY KEY,
    decision_id             INT NOT NULL,
    disposition_type        VARCHAR(20) NOT NULL,
    estimated_revenue       NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    estimated_cost          NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_expected_recovery   NUMERIC(10, 2) GENERATED ALWAYS AS (estimated_revenue - estimated_cost) STORED,
    feasibility_score       NUMERIC(4, 3) NOT NULL,
    rank_order              INT NOT NULL,
    is_recommended          BOOLEAN NOT NULL DEFAULT FALSE,
    rationale               TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_alternatives_decision
        FOREIGN KEY (decision_id)
        REFERENCES disposition_decisions (decision_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_alternatives_decision_disposition UNIQUE (decision_id, disposition_type),
    CONSTRAINT uq_alternatives_decision_rank UNIQUE (decision_id, rank_order),
    CONSTRAINT chk_alternatives_disposition_type CHECK (
        disposition_type IN ('Resell', 'Refurbish', 'Exchange', 'Donate', 'Recycle', 'Write-off')
    ),
    CONSTRAINT chk_alternatives_estimated_revenue CHECK (estimated_revenue >= 0.00),
    CONSTRAINT chk_alternatives_estimated_cost CHECK (estimated_cost >= 0.00),
    CONSTRAINT chk_alternatives_feasibility_score CHECK (
        feasibility_score >= 0.000 AND feasibility_score <= 1.000
    ),
    CONSTRAINT chk_alternatives_rank_order CHECK (rank_order >= 1)
);

-- ----------------------------------------------------------------------------
-- 8. Table: decision_outcomes
-- Real-world executed outcomes and financial recovery verification.
-- ----------------------------------------------------------------------------
CREATE TABLE decision_outcomes (
    outcome_id              SERIAL PRIMARY KEY,
    decision_id             INT NOT NULL,
    disposition_executed    VARCHAR(20) NOT NULL,
    actual_revenue          NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    actual_cost             NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    actual_net_recovery     NUMERIC(10, 2) GENERATED ALWAYS AS (actual_revenue - actual_cost) STORED,
    execution_partner       VARCHAR(150),
    completion_date         DATE NOT NULL DEFAULT CURRENT_DATE,
    outcome_notes           TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_outcomes_decision UNIQUE (decision_id),
    CONSTRAINT fk_outcomes_decision
        FOREIGN KEY (decision_id)
        REFERENCES disposition_decisions (decision_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_outcomes_disposition_executed CHECK (
        disposition_executed IN ('Resell', 'Refurbish', 'Exchange', 'Donate', 'Recycle', 'Write-off')
    ),
    CONSTRAINT chk_outcomes_actual_revenue CHECK (actual_revenue >= 0.00),
    CONSTRAINT chk_outcomes_actual_cost CHECK (actual_cost >= 0.00)
);

-- ============================================================================
-- Secondary Performance & Search Indexes
-- ============================================================================
CREATE INDEX idx_returns_product_id ON returns (product_id);
CREATE INDEX idx_returns_warehouse_id ON returns (warehouse_id);
CREATE INDEX idx_returns_status ON returns (status);
CREATE INDEX idx_operators_warehouse_id ON operators (warehouse_id);
CREATE INDEX idx_inspections_return_id ON inspections (return_id);
CREATE INDEX idx_inspections_inspector_id ON inspections (inspector_id);
CREATE INDEX idx_decisions_return_id ON disposition_decisions (return_id);
CREATE INDEX idx_decisions_operator_id ON disposition_decisions (decided_by_operator_id);
CREATE INDEX idx_alternatives_decision_id ON decision_alternatives (decision_id);
CREATE INDEX idx_outcomes_decision_id ON decision_outcomes (decision_id);
