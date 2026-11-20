# Return Loop API Contract

This document is the agreement between the backend (Express), the frontend (React) and the database.
Build against it. Change it only when the people on both sides of an endpoint agree, and update this file in the same PR.

Status legend used below:

- ✅ **Exists** — already implemented, no change needed
- 🔧 **Change** — already implemented, but must change to match this contract
- 🆕 **New** — not built yet

---

## 1. Conventions

### Base URL

All endpoints live under `/api`. In development the API runs on `http://localhost:3000` and the Vite dev server proxies `/api` to it.

### Request format

- Request bodies are JSON (`Content-Type: application/json`).
- Field names use `snake_case`, matching the database columns.
- IDs in the URL are integers. A non-integer ID returns `400`.

### Response envelope

Every response uses the same shape.

Success:

```json
{
  "success": true,
  "message": "Optional human-readable message",
  "data": { }
}
```

List endpoints that support paging also return `meta`:

```json
{
  "success": true,
  "data": [ ],
  "meta": { "page": 1, "limit": 20, "total": 57 }
}
```

Error:

```json
{
  "success": false,
  "message": "What went wrong",
  "errors": [
    { "field": "return_reason", "message": "return_reason is required" }
  ]
}
```

`errors` is only present for validation failures (`400`).

### Data types

| Kind | Format | Example |
| --- | --- | --- |
| Money | JSON number, 2 decimals | `1249.99` |
| Scores (confidence, feasibility) | JSON number between 0 and 1, 3 decimals | `0.825` |
| Dates | `YYYY-MM-DD` | `"2026-11-21"` |
| Timestamps | ISO 8601 with timezone | `"2026-11-21T10:15:00.000Z"` |

> **Backend note:** the `pg` driver returns `NUMERIC` columns as strings. The backend must convert them to numbers (for example with `pg.types.setTypeParser(1700, parseFloat)`) so the frontend always receives numbers.

### Status codes

| Code | When |
| --- | --- |
| `200` | Read or update succeeded |
| `201` | Resource created |
| `400` | Invalid input or malformed JSON |
| `401` | Missing, invalid or expired token; wrong email or password |
| `403` | Logged in, but the role is not allowed to do this |
| `404` | Resource or route not found |
| `409` | Conflict: duplicate value, or the action is not allowed in the return's current status |
| `500` | Unexpected server error |

---

## 2. Authentication (JWT)

### How it works

1. The user logs in with email and password at `POST /api/auth/login`.
2. The API checks the password against `operators.password_hash` (bcrypt) and returns a signed JWT.
3. The frontend stores the token and sends it on every request:

   ```http
   Authorization: Bearer <token>
   ```

4. Every endpoint except `GET /api/health` and `POST /api/auth/login` requires a valid token.

### Token

- Algorithm: HS256, signed with `JWT_SECRET` from `.env`.
- Expiry: 8 hours (`JWT_EXPIRES_IN=8h`). There are no refresh tokens; the user logs in again.
- Payload:

  ```json
  {
    "sub": 1,
    "role": "SUPERVISOR",
    "warehouse_id": 1,
    "iat": 1763719200,
    "exp": 1763748000
  }
  ```

- On every request the auth middleware also checks that the operator still exists and `is_active = true`. A deactivated operator gets `401` even with an unexpired token.

### Roles

Stored in the new column `operators.app_role`. Roles are cumulative: each role can do everything the role above it in this table can.

| Role | Can do |
| --- | --- |
| `INSPECTOR` | View products and warehouses; create, view and inspect returns **of their own warehouse only**; view recommendations for those returns |
| `SUPERVISOR` | Everything `INSPECTOR` can, plus: make decisions (accept or override), record outcomes, cancel returns, view the dashboard |
| `ADMIN` | Everything `SUPERVISOR` can, plus: manage products, warehouses and operators |

In the endpoint tables below, **Min role** is the lowest role allowed.

### Warehouse privacy

An `INSPECTOR` can only see and act on returns that belong to **their own warehouse** (`operators.warehouse_id`). This keeps each warehouse's data private. `SUPERVISOR` and `ADMIN` see all warehouses.

The backend enforces this on every return endpoint, so the frontend cannot get around it:

| Situation | Result |
| --- | --- |
| `GET /returns` as an `INSPECTOR` | Only their warehouse's returns. The `warehouse_id` filter is ignored and replaced with their own |
| `GET /returns/:id` or any `/returns/:id/...` action on another warehouse's return | `404 Not Found`, the same as if it didn't exist, so it doesn't reveal that the return exists |
| `POST /returns` with another warehouse's `warehouse_id` or `warehouse_code` | `403 Forbidden` |

The warehouse is read from the database on every request (not from the token). So if an admin moves an inspector to another warehouse, the change applies immediately.

### Database change required

Add to `operators`:

```sql
password_hash  VARCHAR(255) NOT NULL,
app_role       VARCHAR(20)  NOT NULL DEFAULT 'INSPECTOR',
CONSTRAINT chk_operators_app_role CHECK (app_role IN ('ADMIN', 'SUPERVISOR', 'INSPECTOR'))
```

The seed data must include at least one active account for each role. Every seeded account uses the development password **`Devanshi1234`** (stored as a bcrypt hash in the seed, never as plain text). Document this in the README. It is for local development only and must never be used for a real deployment.

### New environment variables

| Variable | Description | Example |
| --- | --- | --- |
| `JWT_SECRET` | Secret used to sign tokens. Long and random; never committed | `change-me-to-a-long-random-string` |
| `JWT_EXPIRES_IN` | Token lifetime | `8h` |

---

## 3. Return workflow

A return moves through these statuses. The backend enforces the order: an action attempted in the wrong status returns `409`.

```text
RECEIVED ──start-inspection──► UNDER_INSPECTION ──inspection──► EVALUATED ──decision──► DECIDED ──outcome──► COMPLETED
    │                                 │                              │
    └───────────────────────── cancel ┴──────────────────────────────┴──► CANCELLED
```

| Action | Endpoint | Allowed from status | Moves to |
| --- | --- | --- | --- |
| Create return | `POST /returns` | — | `RECEIVED` |
| Start inspection | `POST /returns/:id/start-inspection` | `RECEIVED` | `UNDER_INSPECTION` |
| Record inspection | `POST /returns/:id/inspections` | `RECEIVED`, `UNDER_INSPECTION`, `EVALUATED` | `EVALUATED` |
| Preview recommendation | `GET /returns/:id/recommendation` | `EVALUATED` | (no change) |
| Make decision | `POST /returns/:id/decision` | `EVALUATED` | `DECIDED` |
| Record outcome | `POST /returns/:id/outcome` | `DECIDED` | `COMPLETED` |
| Cancel | `POST /returns/:id/cancel` | `RECEIVED`, `UNDER_INSPECTION`, `EVALUATED` | `CANCELLED` |

Notes:

- A return can be inspected more than once before a decision (for example, after a second opinion). The **latest** inspection is the one the engine uses.
- Recording an inspection directly from `RECEIVED` is allowed so a quick inspection doesn't need two clicks.
- `decision_alternatives` rows reference a decision, and a decision needs a final disposition and an operator. So the recommendation preview is **calculated but not saved**. When the decision is made, the backend runs the engine again and saves the decision and all six alternatives in **one transaction**.
- Every status change and the writes that cause it happen in one transaction.

---

## 4. Endpoint summary

| Method | Endpoint | Min role | State |
| --- | --- | --- | --- |
| `GET` | `/health` | public | ✅ |
| `POST` | `/auth/login` | public | 🆕 |
| `GET` | `/auth/me` | INSPECTOR | 🆕 |
| `PATCH` | `/auth/password` | INSPECTOR | 🆕 |
| `GET` | `/products` | INSPECTOR | 🔧 (add auth) |
| `GET` | `/products/:id` | INSPECTOR | 🔧 (add auth) |
| `POST` | `/products` | ADMIN | 🆕 |
| `PATCH` | `/products/:id` | ADMIN | 🆕 |
| `GET` | `/warehouses` | INSPECTOR | 🆕 |
| `POST` | `/warehouses` | ADMIN | 🆕 |
| `PATCH` | `/warehouses/:id` | ADMIN | 🆕 |
| `GET` | `/operators` | ADMIN | 🆕 |
| `POST` | `/operators` | ADMIN | 🆕 |
| `PATCH` | `/operators/:id` | ADMIN | 🆕 |
| `GET` | `/returns` | INSPECTOR | 🔧 (auth, filters, paging) |
| `GET` | `/returns/:id` | INSPECTOR | 🔧 (auth, nested details) |
| `POST` | `/returns` | INSPECTOR | 🔧 (auth, stricter validation) |
| `POST` | `/returns/:id/start-inspection` | INSPECTOR | 🆕 |
| `POST` | `/returns/:id/inspections` | INSPECTOR | 🆕 |
| `GET` | `/returns/:id/recommendation` | INSPECTOR | 🆕 |
| `POST` | `/returns/:id/decision` | SUPERVISOR | 🆕 |
| `POST` | `/returns/:id/outcome` | SUPERVISOR | 🆕 |
| `POST` | `/returns/:id/cancel` | SUPERVISOR | 🆕 |
| `GET` | `/dashboard` | SUPERVISOR | 🆕 |

---

## 5. Endpoints

### 5.1 Health

#### `GET /api/health` ✅

Public. Confirms the API is running.

```json
{
  "success": true,
  "message": "Return Loop API is running",
  "service": "Return Loop",
  "environment": "development"
}
```

---

### 5.2 Auth

#### `POST /api/auth/login` 🆕

Public.

Request:

```json
{
  "email": "rajesh.sharma@returnloop.internal",
  "password": "Devanshi1234"
}
```

Response `200`:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "operator_id": 1,
      "employee_code": "OP-101",
      "full_name": "Rajesh Sharma",
      "email": "rajesh.sharma@returnloop.internal",
      "app_role": "SUPERVISOR",
      "warehouse_id": 1
    }
  }
}
```

Errors:

- `400` — email or password missing
- `401` — wrong email or password, or the operator is inactive. The message is always `"Invalid email or password"` so it doesn't reveal which accounts exist.

#### `GET /api/auth/me` 🆕

Returns the logged-in operator (same `user` object as login). The frontend calls this on page load to check that a stored token is still valid.

#### `PATCH /api/auth/password` 🆕

Request:

```json
{
  "current_password": "Devanshi1234",
  "new_password": "new-secret-456"
}
```

Rules: `new_password` is at least 8 characters.

Response `200`: `{ "success": true, "message": "Password updated" }`

Errors: `400` validation, `401` wrong current password.

---

### 5.3 Products

Product object:

```json
{
  "product_id": 1,
  "sku": "APL-IP15-128-BLK",
  "brand": "Apple",
  "model_name": "iPhone 15",
  "category": "Smartphone",
  "retail_price": 79900.00,
  "created_at": "2026-11-16T10:00:00.000Z"
}
```

#### `GET /api/products` 🔧

Query parameters (all optional):

| Param | Description |
| --- | --- |
| `category` | Exact match |
| `q` | Search in SKU, brand and model name (case-insensitive) |

Response `200`: `data` is an array of products.

#### `GET /api/products/:id` 🔧

Response `200`: `data` is one product. `404` if not found.

#### `POST /api/products` 🆕 — ADMIN

Request: `sku`, `brand`, `model_name`, `category`, `retail_price` (all required; `retail_price >= 0`).

Response `201`: the created product. `409` if the SKU already exists.

#### `PATCH /api/products/:id` 🆕 — ADMIN

Request: any subset of the `POST` fields. Response `200`: the updated product.

Products are never deleted (returns reference them).

---

### 5.4 Warehouses

Warehouse object:

```json
{
  "warehouse_id": 1,
  "warehouse_code": "WH-DEL-01",
  "facility_name": "Delhi Returns Hub",
  "city": "New Delhi",
  "state": "Delhi",
  "capacity": 5000,
  "created_at": "2026-11-16T10:00:00.000Z"
}
```

#### `GET /api/warehouses` 🆕

Response `200`: array of warehouses. Used for dropdowns.

#### `POST /api/warehouses` 🆕 — ADMIN

Request: `warehouse_code`, `facility_name`, `city`, `state`, `capacity` (all required; `capacity > 0`).

Response `201`: the created warehouse. `409` if the code already exists.

#### `PATCH /api/warehouses/:id` 🆕 — ADMIN

Request: any subset of the `POST` fields. Response `200`: the updated warehouse.

---

### 5.5 Operators

Operator object (`password_hash` is **never** returned):

```json
{
  "operator_id": 1,
  "employee_code": "OP-101",
  "full_name": "Rajesh Sharma",
  "email": "rajesh.sharma@returnloop.internal",
  "role": "Senior Triage Supervisor",
  "app_role": "SUPERVISOR",
  "warehouse_id": 1,
  "is_active": true,
  "created_at": "2026-11-16T10:00:00.000Z"
}
```

`role` is the job title shown in the UI. `app_role` controls access.

#### `GET /api/operators` 🆕 — ADMIN

Query parameters: `warehouse_id`, `app_role`, `is_active` (all optional).

#### `POST /api/operators` 🆕 — ADMIN

Request:

```json
{
  "employee_code": "OP-106",
  "full_name": "Anita Desai",
  "email": "anita.desai@returnloop.internal",
  "role": "Reverse Logistics Technician",
  "app_role": "INSPECTOR",
  "warehouse_id": 2,
  "password": "temporary-pass-1"
}
```

Rules: all fields required; `password` at least 8 characters; the backend hashes it with bcrypt.

Response `201`: the created operator. `409` if the email or employee code already exists.

#### `PATCH /api/operators/:id` 🆕 — ADMIN

Request: any subset of `full_name`, `role`, `app_role`, `warehouse_id`, `is_active`, `password` (resets the password).

Operators are never deleted. Set `is_active: false` to block login. An admin cannot deactivate themselves or remove their own `ADMIN` role (`409`).

---

### 5.6 Returns

#### `GET /api/returns` 🔧

Query parameters (all optional):

| Param | Description | Default |
| --- | --- | --- |
| `status` | One of the six statuses | all |
| `warehouse_id` | Filter by warehouse. Ignored for `INSPECTOR` (always their own warehouse) | all |
| `q` | Search tracking number or serial number (case-insensitive) | — |
| `page` | Page number, starting at 1 | `1` |
| `limit` | Items per page, max 100 | `20` |

Sorted newest first (`created_at DESC`).

Response `200`:

```json
{
  "success": true,
  "data": [
    {
      "return_id": 12,
      "return_tracking_number": "RET-2026-0012",
      "product_id": 1,
      "sku": "APL-IP15-128-BLK",
      "brand": "Apple",
      "model_name": "iPhone 15",
      "category": "Smartphone",
      "retail_price": 79900.00,
      "warehouse_id": 1,
      "warehouse_code": "WH-DEL-01",
      "facility_name": "Delhi Returns Hub",
      "serial_number": "F2LXK9ABCD12",
      "return_reason": "Screen flickering",
      "return_date": "2026-11-20",
      "status": "EVALUATED",
      "customer_comment": "Started after two days",
      "created_at": "2026-11-20T09:30:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1 }
}
```

`400` if `status` is not a valid status.

#### `GET /api/returns/:id` 🔧

Returns everything the return detail page needs in one call. Sections that don't exist yet are `null` (or `[]` for lists).

Response `200`:

```json
{
  "success": true,
  "data": {
    "return": { "...": "same fields as one item in GET /returns" },
    "inspections": [
      {
        "inspection_id": 7,
        "inspector_id": 3,
        "inspector_name": "Amit Kulkarni",
        "condition_grade": "Good",
        "has_original_packaging": true,
        "has_all_accessories": false,
        "functional_status": "Minor Glitch",
        "repair_estimate": 2500.00,
        "diagnostic_notes": "Display connector loose",
        "inspected_at": "2026-11-20T11:00:00.000Z"
      }
    ],
    "decision": null,
    "alternatives": [],
    "outcome": null
  }
}
```

`inspections` is sorted newest first; the first item is the one the engine uses. `decision`, `alternatives` and `outcome` use the shapes in 5.6.5–5.6.7.

`404` if not found.

#### `POST /api/returns` 🔧

Request:

```json
{
  "product_id": 1,
  "warehouse_id": 1,
  "serial_number": "F2LXK9ABCD12",
  "return_reason": "Screen flickering",
  "return_date": "2026-11-20",
  "customer_comment": "Started after two days",
  "return_tracking_number": "RET-2026-0012"
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `product_id` | yes* | *Or send `sku` instead; the backend looks it up |
| `warehouse_id` | no | Or send `warehouse_code`. If neither is sent, the logged-in operator's warehouse is used. An `INSPECTOR` sending another warehouse gets `403` |
| `return_reason` | yes | Non-empty text |
| `serial_number` | no | |
| `return_date` | no | Defaults to today; cannot be in the future |
| `customer_comment` | no | |
| `return_tracking_number` | no | Generated as `RET-<timestamp>-<random>` if missing |

Changes from the current implementation:

- `status` is **no longer accepted**. New returns always start as `RECEIVED`.
- The silent fallback to `warehouse_id = 1` is replaced by the operator's own warehouse.
- An unknown `sku` or `warehouse_code` returns `400` instead of being ignored.

Response `201`: the created return (same shape as an item in `GET /returns`).

Errors: `400` validation, `409` duplicate tracking number.

#### 5.6.1 `POST /api/returns/:id/start-inspection` 🆕

No body. Moves `RECEIVED` → `UNDER_INSPECTION`.

Response `200`: the updated return. `409` if the status is not `RECEIVED`.

#### 5.6.2 `POST /api/returns/:id/inspections` 🆕

The inspector is the logged-in operator; it is not sent in the body.

Request:

```json
{
  "condition_grade": "Good",
  "functional_status": "Minor Glitch",
  "has_original_packaging": true,
  "has_all_accessories": false,
  "repair_estimate": 2500.00,
  "diagnostic_notes": "Display connector loose"
}
```

| Field | Required | Allowed values |
| --- | --- | --- |
| `condition_grade` | yes | `Excellent`, `Good`, `Fair`, `Damaged` |
| `functional_status` | yes | `Fully Functional`, `Minor Glitch`, `Defective Hardware`, `Non-functional` |
| `has_original_packaging` | no | boolean, default `false` |
| `has_all_accessories` | no | boolean, default `false` |
| `repair_estimate` | no | number `>= 0`, default `0` |
| `diagnostic_notes` | no | text |

What the four values mean:

| Value | Meaning | Example |
| --- | --- | --- |
| `Fully Functional` | Everything works | Opened box, never used |
| `Minor Glitch` | Works, but has a small, cheap-to-fix problem | Needs a firmware re-flash, a loose cable |
| `Defective Hardware` | A part is broken and must be replaced | Dead touchscreen area, broken charging port |
| `Non-functional` | Does not work at all | Liquid damage, won't power on |

> **Decided:** these are the four values already used in `dbms/03_seed.sql`. `functional_status` is free text in the schema today, so the DB team must add a matching constraint:
>
> ```sql
> CONSTRAINT chk_inspections_functional_status CHECK (
>     functional_status IN ('Fully Functional', 'Minor Glitch', 'Defective Hardware', 'Non-functional')
> )
> ```
>
> Any other value returns `400`.

Response `201`: the created inspection, plus `"return_status": "EVALUATED"`.

`409` if the return is `DECIDED`, `COMPLETED` or `CANCELLED`.

#### 5.6.3 `GET /api/returns/:id/recommendation` 🆕

Runs the recommendation engine on the return's product and its latest inspection. **Nothing is saved.**

Response `200`:

```json
{
  "success": true,
  "data": {
    "return_id": 12,
    "inspection_id": 7,
    "recommended_disposition": "Refurbish",
    "confidence_score": 0.742,
    "alternatives": [
      {
        "disposition_type": "Refurbish",
        "estimated_revenue": 51935.00,
        "estimated_cost": 3300.00,
        "net_expected_recovery": 48635.00,
        "feasibility_score": 0.900,
        "rank_order": 1,
        "is_recommended": true,
        "rationale": "Minor glitch with a repair cost of 3% of retail price; refurbished resale recovers the most value."
      },
      {
        "disposition_type": "Resell",
        "estimated_revenue": 39950.00,
        "estimated_cost": 800.00,
        "net_expected_recovery": 39150.00,
        "feasibility_score": 0.300,
        "rank_order": 2,
        "is_recommended": false,
        "rationale": "Item has a fault, so selling as-is is risky and lowers the price."
      }
    ]
  }
}
```

`alternatives` always contains all six dispositions (`Resell`, `Refurbish`, `Exchange`, `Donate`, `Recycle`, `Write-off`), sorted by `rank_order` (1 = best). Exactly one has `is_recommended: true`, and it matches `recommended_disposition`.

`409` if the status is not `EVALUATED`.

**Engine interface (for the service, not HTTP):**

```js
// src/services/recommendation.service.js
recommend({ product, inspection, returnInfo }) // => { recommended_disposition, confidence_score, alternatives }
```

It is a pure function: no database access, so it can be unit-tested on its own. The exact scoring rules are owned by the engine author and documented in the service file.

#### 5.6.4 `POST /api/returns/:id/decision` 🆕 — SUPERVISOR

Accept the recommendation, or override it.

Request (accept):

```json
{
  "final_disposition": "Refurbish"
}
```

Request (override):

```json
{
  "final_disposition": "Donate",
  "override_reason": "Partner NGO requested this model for a school programme"
}
```

Rules:

- The backend runs the engine again; it never trusts recommendation data sent by the client.
- `is_override` is set by the backend: `true` when `final_disposition` differs from the engine's recommendation.
- `override_reason` is required when it is an override (`400` otherwise), and ignored when it isn't.
- `decided_by_operator_id` is the logged-in operator.
- The decision and all six alternatives are saved in one transaction, and the return moves to `DECIDED`.

Response `201`:

```json
{
  "success": true,
  "message": "Decision recorded",
  "data": {
    "decision": {
      "decision_id": 5,
      "return_id": 12,
      "recommended_disposition": "Refurbish",
      "final_disposition": "Donate",
      "is_override": true,
      "override_reason": "Partner NGO requested this model for a school programme",
      "confidence_score": 0.742,
      "decided_by_operator_id": 1,
      "decided_by_name": "Rajesh Sharma",
      "decided_at": "2026-11-21T08:00:00.000Z"
    },
    "alternatives": [ "...six items, same shape as in 5.6.3, plus alternative_id..." ],
    "return_status": "DECIDED"
  }
}
```

`409` if the status is not `EVALUATED` or a decision already exists.

#### 5.6.5 `POST /api/returns/:id/outcome` 🆕 — SUPERVISOR

Records what actually happened.

Request:

```json
{
  "disposition_executed": "Donate",
  "actual_revenue": 0.00,
  "actual_cost": 450.00,
  "execution_partner": "Shiksha Foundation",
  "completion_date": "2026-11-25",
  "outcome_notes": "Picked up by NGO van"
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `disposition_executed` | no | Defaults to the decision's `final_disposition` |
| `actual_revenue` | yes | number `>= 0` |
| `actual_cost` | yes | number `>= 0` |
| `execution_partner` | no | |
| `completion_date` | no | Defaults to today |
| `outcome_notes` | no | |

Response `201`: the created outcome (including the computed `actual_net_recovery`), plus `"return_status": "COMPLETED"`.

`409` if the status is not `DECIDED` or an outcome already exists.

#### 5.6.6 `POST /api/returns/:id/cancel` 🆕 — SUPERVISOR

Request:

```json
{ "reason": "Customer withdrew the return" }
```

`reason` is required. It is appended to `customer_comment` as `[Cancelled] <reason>` (no schema change needed).

Response `200`: the updated return. `409` if the status is `DECIDED`, `COMPLETED` or already `CANCELLED`.

---

### 5.7 Dashboard

#### `GET /api/dashboard` 🆕 — SUPERVISOR

Query parameters: `warehouse_id` (optional; default all warehouses).

Response `200`:

```json
{
  "success": true,
  "data": {
    "returns_by_status": {
      "RECEIVED": 4,
      "UNDER_INSPECTION": 2,
      "EVALUATED": 3,
      "DECIDED": 1,
      "COMPLETED": 9,
      "CANCELLED": 1
    },
    "decisions_by_disposition": {
      "Resell": 3,
      "Refurbish": 4,
      "Exchange": 1,
      "Donate": 1,
      "Recycle": 1,
      "Write-off": 0
    },
    "override_rate": 0.200,
    "total_expected_recovery": 245000.00,
    "total_actual_recovery": 231500.00,
    "recent_returns": [ "...5 most recent, same shape as an item in GET /returns..." ]
  }
}
```

- `override_rate` = decisions with `is_override = true` ÷ all decisions (`0` when there are none).
- `total_expected_recovery` = sum of `net_expected_recovery` of the **final** disposition's alternative, over decided returns.
- `total_actual_recovery` = sum of `actual_net_recovery` over all outcomes.

---

## 6. Decisions log

- `functional_status` is limited to `Fully Functional`, `Minor Glitch`, `Defective Hardware`, `Non-functional`, with a matching DB constraint (section 5.6.2).
- An `INSPECTOR` only sees their own warehouse's returns (see "Warehouse privacy" in section 2).
- Seeded accounts use the development password `Devanshi1234`.
