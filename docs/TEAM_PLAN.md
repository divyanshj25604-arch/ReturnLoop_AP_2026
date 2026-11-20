# Return Loop: Team Work Breakdown

This document explains how the work on Return Loop was divided between the three of us: who owns which part, the order the work was done in, and what each commit had to contain.

The project was built as **36 commits, done in a fixed order**. Each commit is one step owned by one person. A step's details (section 7) say what to build and how to know it's finished. The API that the backend and frontend share is defined in [`docs/api.md`](api.md).

**Status:** all 36 steps are complete and on `main`. Fixes made after step 36 are ordinary commits without a step tag.

---

## 1. What Return Loop is

Return Loop is a decision intelligence app for **returned electronics**. When a customer returns a product, the warehouse must decide what to do with it. Every return ends in one of six **dispositions**:

1. **Resell**: sell it again as-is
2. **Refurbish**: repair it, then resell
3. **Exchange**: use it to fulfil a customer replacement
4. **Donate**: give it to a charity
5. **Recycle**: send it for material recovery
6. **Write-off**: remove it from inventory as a loss

The app tracks each return from arrival to final outcome. A rule-based **recommendation engine** scores all six options and suggests the best one. A supervisor accepts or overrides it.

### Return lifecycle

```text
RECEIVED ─► UNDER_INSPECTION ─► EVALUATED ─► DECIDED ─► COMPLETED
   └────────────── cancel (before DECIDED) ──────────────► CANCELLED
```

| Stage | Who | What happens | Table |
| --- | --- | --- | --- |
| Log a return | Inspector | Product, warehouse, reason | `returns` |
| Inspect | Inspector | Condition grade, functional status, repair cost | `inspections` |
| Recommend | System | Engine ranks the 6 options (preview, not saved) | — |
| Decide | Supervisor | Accept the top pick or override with a reason | `disposition_decisions` + `decision_alternatives` |
| Outcome | Supervisor | What really happened, real revenue and cost | `decision_outcomes` |

---

## 2. Team and responsibilities

| Code | Name | Owns | Steps | Count |
| --- | --- | --- | --- | --- |
| **DJ** | Divyansh Jha | Backend API, JWT login and roles, warehouse privacy, API tests, end-to-end testing, final README | 01, 06, 08, 10, 13, 15, 18, 20, 22, 24, 27, 30, 33, 35, 36 | 15 |
| **SR** | Shreyansh Rathaur | Database schema, seed data and setup script; the recommendation engine and its tests and docs | 02, 03, 04, 05, 12, 17, 21, 26 | 8 |
| **DK** | Devanshi Kumari | The React frontend (every page) and the dashboard SQL | 07, 09, 11, 14, 16, 19, 23, 25, 28, 29, 31, 32, 34 | 13 |

Step 36 (final README) was first given to Shreyansh and later moved to Divyansh.

### What each person delivers

**Divyansh (backend)**
- The API contract (`docs/api.md`) and this plan.
- Shared backend helpers: input validation, error format, number handling.
- Login with JWT, the `requireAuth` / `requireRole` middleware, and the rule that inspectors only see their own warehouse.
- Every endpoint in the return workflow: listing and creating returns, inspections, recommendation preview, decisions, outcomes, cancelling, and the dashboard.
- Admin endpoints for products, warehouses and operators.
- API tests, including one test that walks a return through the whole lifecycle.
- End-to-end testing in the browser and the fixes it found; the final README.

**Shreyansh (database and engine)**
- Cleaning up `dbms/` and the schema changes for login (`password_hash`, `app_role`) and the fixed `functional_status` values.
- Seed data that covers every role, every warehouse and every return status, plus `npm run db:setup`.
- The recommendation engine (`src/services/recommendation.service.js`): scoring, ranking, confidence and the reason shown for each option.
- Engine unit tests and the engine documentation (`docs/engine.md`).

**Devanshi (frontend)**
- The React app in `client/`: setup, API client, login, layout and menu by role.
- Pages: returns list, new return form, return detail (inspection, recommendation cards, accept/override, outcome, cancel), dashboard, admin.
- Loading, empty and error states across the app.
- The dashboard SQL queries (`dbms/07_dashboard_queries.sql`).

---

## 3. Decisions the team made

| Topic | Decision |
| --- | --- |
| Stack | PostgreSQL + Node.js/Express (CommonJS) backend + **React (Vite, JavaScript)** frontend |
| Repo layout | Backend stays at the repo root (`src/`). Frontend goes in `client/`. |
| Login | **JWT** (HS256, 8 h expiry, no refresh tokens). Passwords hashed with bcrypt. No sign-up page; admins create accounts. |
| Roles | `INSPECTOR` < `SUPERVISOR` < `ADMIN`, stored in the column `operators.app_role`. Each role can do everything the lower roles can. |
| Warehouse privacy | An `INSPECTOR` only sees and acts on returns from **their own warehouse**. Other warehouses' returns give `404`. Supervisors and admins see all. |
| Test password | Every seeded account uses the password **`Devanshi1234`** (stored as a bcrypt hash). Development only. |
| `functional_status` | Only 4 values: `Fully Functional`, `Minor Glitch`, `Defective Hardware`, `Non-functional`. Enforced by a DB `CHECK` constraint. |
| Recommendation storage | `GET /returns/:id/recommendation` only calculates. `POST /returns/:id/decision` re-runs the engine and saves the decision and all 6 alternatives in **one transaction**. |
| No deletes | Products, warehouses and operators are never deleted. Operators are deactivated with `is_active = false`. |
| API contract | [`docs/api.md`](api.md) defines every endpoint. Backend and frontend both build exactly to it. |

---

## 4. Project conventions

### Folder layout

```text
ReturnLoop_AP_2026/
├── src/
│   ├── config/        env.js, db.js
│   ├── routes/        *.routes.js, mounted in routes/index.js under /api
│   ├── controllers/   *.controller.js  (HTTP in/out, validation, status codes)
│   ├── models/        *.model.js       (SQL only, uses config/db.js)
│   ├── services/      business logic, incl. recommendation.service.js
│   ├── middleware/    auth, role, error handling
│   ├── utils/         shared helpers
│   ├── app.js
│   └── server.js
├── client/            React app (Vite)
├── dbms/              schema, seed, queries, design docs
├── scripts/           db-setup.js
├── tests/             node:test files (*.test.js)
└── docs/              api.md, engine.md, TEAM_PLAN.md, screenshots/
```

### Backend rules

- CommonJS (`require` / `module.exports`), Express 5, `pg` pool from `src/config/db.js`.
- Route → controller → model. Business logic that isn't SQL goes in `services/`.
- Every response uses the envelope in `docs/api.md` section 1: `{ success, message?, data?, meta?, errors? }`.
- Parameterized SQL only (`$1, $2…`). Never build SQL with string concatenation of user input.
- Anything that changes more than one table, or changes a status plus writes a row, uses a transaction (`BEGIN` / `COMMIT` / `ROLLBACK` on one client from `pool.connect()`).
- Tests use the built-in `node:test` runner and `fetch` against `app.listen(0)`, like `tests/health.test.js`. Tests that need the database read `DATABASE_URL` from `.env` and assume `npm run db:setup` has been run.

### Frontend rules

- Vite + React + JavaScript (no TypeScript), `react-router-dom`, `axios`.
- Dev server on port `5173`, with `/api` proxied to `http://localhost:3000` in `vite.config.js`.
- Token stored in `localStorage` under the key `rl_token`.
- All API calls go through one client module (`client/src/api/client.js`).
- Plain CSS is fine. No UI framework is required.

### Database files

| File | Contents |
| --- | --- |
| `dbms/00_database_design.md` | Entities and relationships |
| `dbms/01_normalization.md` | Normalization analysis |
| `dbms/02_er_diagram.md` + `.png` | ER diagram |
| `dbms/03_schema.sql` | `CREATE TABLE` statements (re-runnable) |
| `dbms/04_seed.sql` | Seed data (re-runnable) |
| `dbms/05_queries.sql` | Example queries |
| `dbms/06_query_timings.md` | Query results and timings |
| `dbms/07_dashboard_queries.sql` | Dashboard SQL (added in step 29) |

### Commit messages

Conventional commits, ending with the step tag: `type(scope): summary [step NN]`. The exact message for every step is in section 6.

---

## 5. How each step is done

Every step follows the same routine:

1. **Pull the latest code** from `main`, so you're building on everyone else's finished steps:

   ```bash
   git checkout main
   git pull --rebase origin main
   ```

2. **Check the step before yours is done.** All earlier steps should already be on `main`. You can list the finished steps with:

   ```bash
   git log --format=%s | grep -oE '\[step [0-9]{2}\]' | sort -u
   ```

3. **Build only your step.** Use its details in section 7, the API contract in `docs/api.md`, and the conventions in section 4. Don't start the next step or change parts owned by someone else in the same commit.

4. **Check it works.** Run the tests, and the frontend build if you changed `client/`. Go through the step's **Done when** list.

   ```bash
   npm test
   npm run client:build
   ```

5. **Commit and push.** One step is one commit, using the exact message from section 6. Then tell the team that your step is pushed and whose step is next.

   ```bash
   git commit -m "<exact message from section 6>"
   git pull --rebase origin main
   git push origin main
   ```

### Team rules

- One step = one commit. Don't combine steps or split one step into several commits.
- Do your own steps. If someone is stuck, talk to them rather than doing their step.
- `docs/api.md` changes only when the people on both sides of an endpoint agree, and the change goes in the same commit as the code.
- Never commit `.env`. Add new settings to `.env.example` with placeholder values.
- Never force-push or rewrite `main`'s history.

---

## 6. Commit order

Steps were done in this order, one after another. A step started only once every step above it was on `main`.

| Step | Owner | Exact commit message |
| --- | --- | --- |
| 01 | DJ | `docs: add API contract and team build plan [step 01]` |
| 02 | SR | `chore(dbms): remove duplicate files and fix numbering [step 02]` |
| 03 | SR | `feat(dbms): add password_hash, app_role and functional_status check [step 03]` |
| 04 | SR | `feat(dbms): seed hashed test passwords, roles and returns per warehouse [step 04]` |
| 05 | SR | `chore(dbms): add npm run db:setup script [step 05]` |
| 06 | DJ | `feat(api): add numeric parsing, validation and error helpers [step 06]` |
| 07 | DK | `chore(client): scaffold Vite React app with router and api proxy [step 07]` |
| 08 | DJ | `feat(auth): add login, me and change-password endpoints [step 08]` |
| 09 | DK | `feat(client): add API client with token header and 401 redirect [step 09]` |
| 10 | DJ | `feat(auth): add requireAuth and requireRole, protect existing routes [step 10]` |
| 11 | DK | `feat(client): add login page, auth context and protected routes [step 11]` |
| 12 | SR | `feat(engine): score and rank the six dispositions [step 12]` |
| 13 | DJ | `feat(api): restrict inspectors to their own warehouse [step 13]` |
| 14 | DK | `feat(client): add role-aware layout and navigation [step 14]` |
| 15 | DJ | `feat(returns): add filters, paging, full detail and stricter create [step 15]` |
| 16 | DK | `feat(client): add returns list page [step 16]` |
| 17 | SR | `feat(engine): add confidence score and rationale text [step 17]` |
| 18 | DJ | `feat(api): add warehouse and product admin endpoints [step 18]` |
| 19 | DK | `feat(client): add new return form [step 19]` |
| 20 | DJ | `feat(api): add operator admin endpoints [step 20]` |
| 21 | SR | `test(engine): add unit tests for all grades and edge cases [step 21]` |
| 22 | DJ | `feat(returns): add start-inspection and inspection endpoints [step 22]` |
| 23 | DK | `feat(client): add return detail page with inspection step [step 23]` |
| 24 | DJ | `feat(returns): add recommendation preview and decision transaction [step 24]` |
| 25 | DK | `feat(client): add recommendation cards with accept and override [step 25]` |
| 26 | SR | `docs(engine): document scoring rules [step 26]` |
| 27 | DJ | `feat(returns): add outcome and cancel endpoints [step 27]` |
| 28 | DK | `feat(client): add outcome and cancel steps [step 28]` |
| 29 | DK | `feat(dbms): add dashboard SQL queries [step 29]` |
| 30 | DJ | `feat(api): add dashboard endpoint [step 30]` |
| 31 | DK | `feat(client): add dashboard page [step 31]` |
| 32 | DK | `feat(client): add admin pages for products, warehouses and operators [step 32]` |
| 33 | DJ | `test(api): add tests for auth, roles, privacy and full return flow [step 33]` |
| 34 | DK | `feat(client): add loading, empty and error states [step 34]` |
| 35 | DJ | `fix: resolve issues found in end-to-end testing [step 35]` |
| 36 | DJ | `docs: update README with setup, test logins and screenshots [step 36]` |

Totals: DJ 15 · DK 13 · SR 8 (36 steps).

### Why this order: dependencies

The order above respects all of these.

**Hard dependencies** (the step cannot work without these):

| Step | Needs |
| --- | --- |
| 02 | 01 |
| 03 | 02 |
| 04 | 03 |
| 05 | 04 |
| 06 | 01 |
| 07 | 01 |
| 08 | 04, 06 |
| 10 | 08 |
| 12 | 01 |
| 13 | 10 |
| 15 | 13 |
| 17 | 12 |
| 18 | 10 |
| 20 | 10 |
| 21 | 17 |
| 22 | 15 |
| 24 | 17, 22 |
| 26 | 21 |
| 27 | 24 |
| 29 | 03 |
| 30 | 10, 29 |
| 33 | 27, 30 |
| 35 | everything from 02 to 34 |
| 36 | 35 |

**Soft dependencies** (frontend steps). These can be built against the example responses in `docs/api.md` and switched to the real endpoint once it exists:

| Step | Builds on | Real data comes from |
| --- | --- | --- |
| 09 | 07 | — |
| 11 | 09 | 08 |
| 14 | 11 | — |
| 16 | 14 | 15 |
| 19 | 14 | 15, 18 |
| 23 | 16 | 22 |
| 25 | 23 | 24 |
| 28 | 25 | 27 |
| 31 | 14 | 30 |
| 32 | 14 | 18, 20 |
| 34 | 31, 32 | — |

---

## 7. Step details

Each step lists what to build and a **Done when** checklist: the step is finished when every item on it is true. `docs/api.md` has the exact request/response shapes; section numbers below refer to it.

### Step 01 (DJ): API contract and team plan

- Add `docs/api.md` and `docs/TEAM_PLAN.md` (this file).
- **Done when:** both files are committed and pushed; teammates can pull them.

### Step 02 (SR): Clean up `dbms/`

- Remove the duplicates: `dbms/02_schema.sql` and `dbms/03_schema.sql` are identical; `dbms/02_er_diagram.png` and `dbms/03_er_diagram.png` are identical.
- Rename to the final layout in section 4 using `git mv` (keeps history):
  - keep `03_schema.sql`, delete `02_schema.sql`
  - `03_er_diagram.md` → `02_er_diagram.md`; keep `02_er_diagram.png`, delete `03_er_diagram.png`
  - `03_seed.sql` → `04_seed.sql`
  - `04_queries.sql` → `05_queries.sql`
  - `05_query_timings.md` → `06_query_timings.md`
- Fix any references to the old file names inside `dbms/*.md` and the README.
- **Done when:** `dbms/` matches the table in section 4 (minus `07_`), with no duplicates and no broken references.

### Step 03 (SR): Schema changes

In `dbms/03_schema.sql`:

- `operators`: add `password_hash VARCHAR(255) NOT NULL` and `app_role VARCHAR(20) NOT NULL DEFAULT 'INSPECTOR'` with `CONSTRAINT chk_operators_app_role CHECK (app_role IN ('ADMIN', 'SUPERVISOR', 'INSPECTOR'))`.
- `inspections`: add `CONSTRAINT chk_inspections_functional_status CHECK (functional_status IN ('Fully Functional', 'Minor Glitch', 'Defective Hardware', 'Non-functional'))`.
- Add `CREATE EXTENSION IF NOT EXISTS pgcrypto;` near the top (used by the seed to hash passwords).
- Update `dbms/00_database_design.md` and `dbms/02_er_diagram.md` to list the new columns and constraints.
- **Done when:** the schema runs cleanly twice in a row on an empty database (it already drops tables first).

### Step 04 (SR): Seed data

In `dbms/04_seed.sql`:

- Give every operator a `password_hash` for the password `Devanshi1234`, generated in SQL: `crypt('Devanshi1234', gen_salt('bf', 10))`. This produces a bcrypt hash that `bcryptjs` can verify.
- Give every operator an `app_role`. There must be **at least one active `ADMIN`, one active `SUPERVISOR` and one active `INSPECTOR`**, and at least two inspectors in **different** warehouses (needed to test warehouse privacy).
- Make sure every warehouse has some returns, and that there are returns in **every status** (`RECEIVED`, `UNDER_INSPECTION`, `EVALUATED`, `DECIDED`, `COMPLETED`, `CANCELLED`) so every screen has data.
- Keep data consistent with the lifecycle: `RECEIVED` returns have no inspection; `EVALUATED` returns have an inspection but no decision; `DECIDED` returns have a decision and 6 alternatives but no outcome; `COMPLETED` returns have all of these.
- All `functional_status` values must be one of the four allowed values.
- **Done when:** schema + seed run cleanly together twice in a row; a table listing each operator's email and `app_role` is added as a comment at the top of the seed file.

### Step 05 (SR): `npm run db:setup`

- Add `scripts/db-setup.js`: connects using the same config as `src/config/db.js`, runs `dbms/03_schema.sql` then `dbms/04_seed.sql`, prints success or the error, and exits with code 0 or 1.
- Add `"db:setup": "node scripts/db-setup.js"` to `package.json` scripts.
- Add a short "Database setup" section to the README (create the database, set `DATABASE_URL`, run `npm run db:setup`).
- **Done when:** `npm run db:setup` rebuilds the database from scratch with one command, and can be run repeatedly.

### Step 06 (DJ): Shared backend helpers

- In `src/config/db.js`, make `NUMERIC` columns come back as numbers: `pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)))`.
- Add `src/utils/` helpers used by all later backend steps:
  - `parseId(value)`: returns an integer or `null`.
  - A small `ApiError` class (`status`, `message`, optional `errors` array) that `errorHandler` understands.
  - Validation helpers (required string, number ≥ 0, enum value, boolean, date not in the future) that collect `{ field, message }` errors.
- Update `src/middleware/errorHandler.js` to output `errors` when present, matching `docs/api.md` section 1.
- **Done when:** `npm test` passes; existing endpoints still behave the same.

### Step 07 (DK): Scaffold the React app

- Create `client/` with Vite (React, JavaScript). Add `react-router-dom` and `axios`.
- `client/vite.config.js`: dev server port `5173`, proxy `/api` to `http://localhost:3000`.
- Placeholder routes: `/login`, `/` (dashboard), `/returns`, `/returns/new`, `/returns/:id`, `/admin`.
- Add root `package.json` scripts: `"client:dev": "npm --prefix client run dev"` and `"client:build": "npm --prefix client run build"`.
- Make sure `.gitignore` covers `client/node_modules` and `client/dist`.
- **Done when:** `npm --prefix client run build` succeeds, and each placeholder route renders its name.

### Step 08 (DJ): Auth endpoints

- Install `bcryptjs` and `jsonwebtoken`.
- Add `JWT_SECRET` and `JWT_EXPIRES_IN` to `src/config/env.js` and `.env.example` (placeholder secret). The server must refuse to start without `JWT_SECRET`.
- Implement `POST /api/auth/login`, `GET /api/auth/me`, `PATCH /api/auth/password` exactly as `docs/api.md` section 5.2. `me` and `password` read the token themselves for now (the shared middleware comes in step 10).
- Wrong email, wrong password and inactive operator all return `401` with `"Invalid email or password"`.
- Never return `password_hash` in any response.
- **Done when:** you can log in with a seeded account and `Devanshi1234`, receive a token, and call `/auth/me` with it.

### Step 09 (DK): API client

- `client/src/api/client.js`: an axios instance with `baseURL: '/api'` that adds `Authorization: Bearer <rl_token>` when a token exists.
- On a `401` response: remove `rl_token` and redirect to `/login` (except for the login request itself).
- Helper to read the error message from the API envelope (`response.data.message`).
- **Done when:** build passes; the client module is used by at least one placeholder page.

### Step 10 (DJ): Auth middleware

- `src/middleware/auth.js`: `requireAuth` verifies the token, loads the operator from the database, rejects missing/invalid/expired tokens and inactive operators with `401`, and sets `req.user = { operator_id, app_role, warehouse_id, full_name, email }` from the **database** (not from the token).
- `requireRole(minRole)`: uses the order `INSPECTOR` < `SUPERVISOR` < `ADMIN`; returns `403` if too low.
- Switch the auth routes from step 08 to use `requireAuth`.
- Protect all existing product and return routes. Only `/api/health` and `/api/auth/login` stay public.
- **Done when:** requests without a token get `401`; a valid token works; tests cover both.

### Step 11 (DK): Login and auth context

- `AuthContext`: holds `user` and `token`; on app load, if `rl_token` exists, calls `GET /api/auth/me` to restore the user; provides `login(email, password)` and `logout()`.
- Login page: email + password form, shows the API error message, redirects to `/` on success.
- `ProtectedRoute`: sends logged-out users to `/login`. Optionally takes a minimum role and shows a "not allowed" message if the user's role is too low.
- **Done when:** you can log in with a seeded account, refresh the page and stay logged in, and log out.

### Step 12 (SR): Recommendation engine (first version)

Create `src/services/recommendation.service.js` exporting a **pure function** (no database, no Express):

```js
recommend({ product, inspection, returnInfo })
// => { recommended_disposition, confidence_score, alternatives: [...] }
```

Inputs: `product.retail_price`; `inspection.condition_grade`, `functional_status`, `repair_estimate`, `has_original_packaging`, `has_all_accessories`; `returnInfo.return_reason` (optional).

Each alternative has: `disposition_type`, `estimated_revenue`, `estimated_cost`, `net_expected_recovery` (= revenue − cost), `feasibility_score` (0–1), `rank_order`, `is_recommended`, `rationale` (empty string is fine in this step).

**Baseline rules.** SR may tune the numbers, but must keep this structure and document any changes in step 26. `P` = retail price, `R` = repair estimate, `H` = handling cost = `max(200, 0.01 × P)`.

Grade factor `G`: Excellent `0.85`, Good `0.70`, Fair `0.50`, Damaged `0.25`.

| Disposition | Revenue | Cost | Feasibility |
| --- | --- | --- | --- |
| Resell | `P × G` | `H` | Fully Functional + Excellent/Good → `0.95`; Fully Functional + Fair → `0.60`; Minor Glitch → `0.30`; otherwise `0` |
| Refurbish | `P × 0.65` | `R + H` | `R > 0.6 × P` → `0.10`; else Minor Glitch → `0.90`, Defective Hardware → `0.80`, Fully Functional → `0.50`, Non-functional → `0.20` |
| Exchange | `P × G` | `H` | Fully Functional + Excellent + packaging + accessories → `0.90`; Fully Functional + Good → `0.50`; otherwise `0` |
| Donate | `P × 0.10` | `H` | Fully Functional or Minor Glitch → `0.70`; otherwise `0.10` |
| Recycle | `P × 0.03` | `H × 0.5` | always `1.00` |
| Write-off | `0` | `0` | always `1.00` |

- **Score** = `net_expected_recovery × feasibility_score`. Rank by score, highest first (`rank_order` 1 = best). Break ties in the table order above.
- The rank-1 option has `is_recommended: true`; it is the `recommended_disposition`.
- Round money to 2 decimals and scores to 3 decimals.
- `confidence_score`: a fixed `0.5` placeholder in this step (real formula in step 17).
- Always return all 6 alternatives.
- **Done when:** calling `recommend()` with a sample input returns 6 ranked alternatives with exactly one recommended.

### Step 13 (DJ): Warehouse privacy

- Implement the rules in `docs/api.md` section 2, "Warehouse privacy", for the existing return routes:
  - `GET /returns` as `INSPECTOR` → only their warehouse (ignore any `warehouse_id` query param).
  - `GET /returns/:id` on another warehouse's return as `INSPECTOR` → `404`.
  - `POST /returns` as `INSPECTOR` with another warehouse → `403`.
- Put the check in one reusable place (for example a helper `loadReturnForUser(id, user)` that returns the return or throws `404`), so steps 22, 24 and 27 can reuse it.
- **Done when:** tests show an inspector from warehouse A cannot list, open or create returns for warehouse B, and a supervisor can.

### Step 14 (DK): Layout and navigation

- App layout with a header (app name, logged-in user's name and role, logout button) and a nav menu.
- Menu items by role: everyone → Returns, New return; `SUPERVISOR`+ → Dashboard; `ADMIN` → Admin.
- After login: supervisors and admins land on `/` (dashboard); inspectors land on `/returns`.
- **Done when:** logging in as each seeded role shows the correct menu.

### Step 15 (DJ): Returns endpoints upgrade

Match `docs/api.md` section 5.6 exactly:

- `GET /returns`: filters `status`, `warehouse_id`, `q` (tracking or serial, case-insensitive), paging `page`/`limit` (max 100), sorted `created_at DESC`, response includes `meta`.
- `GET /returns/:id`: returns `{ return, inspections, decision, alternatives, outcome }` (inspections newest first; missing sections `null` or `[]`).
- `POST /returns`: no longer accepts `status`; defaults the warehouse to the user's own; unknown `sku` or `warehouse_code` → `400`; `return_date` cannot be in the future.
- **Done when:** tests cover the filters, paging, the nested detail shape and the new create rules.

### Step 16 (DK): Returns list page

- Table of returns: tracking number, product (brand + model), warehouse, status, return date.
- Filters: status dropdown, search box (`q`), warehouse dropdown (hidden for inspectors). Pagination controls.
- Status shown as a coloured badge. Clicking a row opens `/returns/:id`.
- **Done when:** the list loads real data, the filters and paging work, and an inspector only sees their warehouse.

### Step 17 (SR): Confidence and rationale

- `confidence_score`: let `s1` and `s2` be the scores of rank 1 and rank 2. If `s1 <= 0`, confidence is `0.5`. Otherwise `0.5 + 0.5 × (s1 − s2) / s1`, clamped to 0–1, rounded to 3 decimals.
- `rationale`: one plain-English sentence per alternative explaining its score (for example: "Minor glitch with a repair cost of 3% of retail price; refurbished resale recovers the most value." or "Item is not fully functional, so it cannot be resold as-is.").
- **Done when:** every alternative has a non-empty rationale, and a clear winner gives a higher confidence than a close call.

### Step 18 (DJ): Warehouse and product admin endpoints

- `GET /warehouses` (any logged-in user), `POST /warehouses` and `PATCH /warehouses/:id` (`ADMIN`).
- `GET /products` gets the `category` and `q` filters; add `POST /products` and `PATCH /products/:id` (`ADMIN`).
- Duplicate SKU or warehouse code → `409`. Validation per `docs/api.md` sections 5.3 and 5.4.
- **Done when:** tests cover admin-only access, validation and duplicates.

### Step 19 (DK): New return form

- Fields per `docs/api.md` `POST /returns`: product (dropdown from `GET /products`, searchable is nice to have), warehouse (dropdown from `GET /warehouses`; for inspectors fixed to their own and disabled), serial number, return reason, return date, customer comment, optional tracking number.
- Show field errors from the API's `errors` array next to the fields.
- On success, go to the new return's detail page.
- **Done when:** creating a return works end to end and validation errors show next to the right fields.

### Step 20 (DJ): Operator admin endpoints

- `GET /operators` (filters `warehouse_id`, `app_role`, `is_active`), `POST /operators`, `PATCH /operators/:id`, all `ADMIN` only, per `docs/api.md` section 5.5.
- Hash passwords with bcrypt. Never return `password_hash`.
- An admin cannot deactivate themselves or remove their own `ADMIN` role → `409`.
- Duplicate email or employee code → `409`.
- **Done when:** tests cover creation, the self-protection rule, and that a deactivated operator can no longer log in.

### Step 21 (SR): Engine unit tests

- `tests/recommendation.service.test.js` (no database needed). Cover at least:
  - every `condition_grade` × every `functional_status`
  - repair estimate above 60% of retail price (Refurbish becomes almost infeasible)
  - Excellent + packaging + accessories (Exchange feasible) vs. missing accessories
  - `retail_price` of 0
  - always 6 alternatives, unique `rank_order` 1–6, exactly one `is_recommended`, it matches `recommended_disposition`
  - `net_expected_recovery` = revenue − cost; all scores between 0 and 1
- Fix any engine bugs the tests find (inside `recommendation.service.js` only).
- **Done when:** `npm test` passes with the new tests.

### Step 22 (DJ): Inspection endpoints

- `POST /returns/:id/start-inspection` and `POST /returns/:id/inspections` per `docs/api.md` sections 5.6.1 and 5.6.2, including the status rules in section 3.
- The inspector is `req.user`. Recording an inspection sets the return to `EVALUATED` in the same transaction.
- Reuse the warehouse privacy helper from step 13.
- **Done when:** tests cover the happy path, invalid values, wrong-status `409`, and another warehouse's inspector getting `404`.

### Step 23 (DK): Return detail page with inspection

- `/returns/:id` loads `GET /returns/:id` and shows:
  - a progress bar of the lifecycle (current status highlighted)
  - return info card (product, warehouse, reason, customer comment, dates)
  - inspection history (newest first)
- If status is `RECEIVED`: a "Start inspection" button.
- If status is `RECEIVED`, `UNDER_INSPECTION` or `EVALUATED`: the inspection form (grade and functional status as dropdowns with the fixed values, packaging and accessories checkboxes, repair estimate, notes).
- Refresh the page data after each action.
- **Done when:** an inspector can open a return, start an inspection, submit it, and see the status become `EVALUATED`.

### Step 24 (DJ): Recommendation and decision endpoints

- `GET /returns/:id/recommendation`: loads the product and the latest inspection, calls `recommend()`, returns the result (nothing saved). Status must be `EVALUATED`.
- `POST /returns/:id/decision` (`SUPERVISOR`): in **one transaction**, re-run the engine, work out `is_override`, require `override_reason` for overrides, insert into `disposition_decisions` and all 6 rows into `decision_alternatives`, and set the return to `DECIDED`. Per `docs/api.md` section 5.6.4.
- **Done when:** tests cover accept, override with and without a reason, inspector getting `403` on decision, and wrong-status `409`.

### Step 25 (DK): Recommendation cards and decision

- On the detail page when status is `EVALUATED`: load `GET /returns/:id/recommendation` and show 6 cards ranked 1–6, each with disposition, net recovery, revenue, cost, feasibility and rationale. Highlight the recommended one and show the confidence score.
- Supervisors see an "Accept recommendation" button and an "Override" option (choose another disposition + required reason). Inspectors see the cards but no buttons.
- When status is `DECIDED` or later: show the saved decision (final vs. recommended, override reason, who decided) and the saved alternatives.
- **Done when:** a supervisor can accept and override; the page then shows the saved decision.

### Step 26 (SR): Document the engine

- Add a clear comment block at the top of `recommendation.service.js` and a short "Recommendation engine" section in `dbms/00_database_design.md` (or a new `docs/engine.md`) explaining the inputs, the table of rules, scoring, ranking, confidence, and any numbers changed from the baseline in step 12.
- **Done when:** someone who hasn't read the code can understand why the engine picked an option.

### Step 27 (DJ): Outcome and cancel endpoints

- `POST /returns/:id/outcome` (`SUPERVISOR`) per `docs/api.md` section 5.6.5: status must be `DECIDED`; `disposition_executed` defaults to the final disposition; sets status `COMPLETED` in the same transaction.
- `POST /returns/:id/cancel` (`SUPERVISOR`) per `docs/api.md` section 5.6.6: allowed only before `DECIDED`; `reason` required; append `[Cancelled] <reason>` to `customer_comment`.
- **Done when:** tests cover both, including wrong-status `409` and duplicate outcome `409`.

### Step 28 (DK): Outcome and cancel on the detail page

- When status is `DECIDED` (supervisors): an outcome form (disposition executed, defaulting to the final disposition; actual revenue; actual cost; partner; completion date; notes).
- When status is `COMPLETED`: show the outcome, with expected vs. actual net recovery side by side.
- Before `DECIDED` (supervisors): a "Cancel return" button that asks for a reason.
- **Done when:** a supervisor can take a return all the way from `EVALUATED` to `COMPLETED`, and can cancel a return.

### Step 29 (DK): Dashboard SQL

- `dbms/07_dashboard_queries.sql`: one query per figure in `docs/api.md` section 5.7, each with an optional warehouse filter:
  returns by status, decisions by final disposition, override rate, total expected recovery (the final disposition's alternative), total actual recovery, 5 most recent returns.
- Reuse ideas from `dbms/05_queries.sql`.
- **Done when:** every query runs against the seeded database and returns the expected kind of result (paste sample output in a comment under each query).

### Step 30 (DJ): Dashboard endpoint

- `GET /api/dashboard` (`SUPERVISOR`), optional `warehouse_id`, using the SQL from step 29. Response exactly as `docs/api.md` section 5.7. All 6 statuses and all 6 dispositions are always present (0 when none).
- **Done when:** tests check the response shape and that inspectors get `403`.

### Step 31 (DK): Dashboard page

- Summary tiles: returns by status, override rate, expected vs. actual recovery.
- A simple chart or bar list of decisions by disposition (a small chart library is fine, or plain CSS bars).
- Recent returns list (links to detail). Warehouse filter dropdown.
- **Done when:** the dashboard shows real numbers for all warehouses and for one warehouse.

### Step 32 (DK): Admin pages

- `/admin` with three tabs: Products, Warehouses, Operators.
- Each tab: a table, a "New" form, and an edit form. Operators: set role, warehouse, active/inactive, reset password. No delete buttons.
- Only `ADMIN` can open `/admin`.
- **Done when:** an admin can create and edit each type; a deactivated operator can no longer log in.

### Step 33 (DJ): API tests

- Fill the gaps so the test suite covers: login success/failure, `401` without a token, `403` per role, warehouse privacy, and **one full flow** from `POST /returns` → start inspection → inspection → recommendation → decision → outcome, checking the status at every stage.
- Tests must leave the database usable (clean up what they create, or document that `npm run db:setup` resets it).
- **Done when:** `npm test` passes on a freshly set-up database.

### Step 34 (DK): Loading, empty and error states

- Every page shows a loading indicator while fetching, a friendly message when a list is empty, and the API error message when a request fails.
- Buttons are disabled while their request is running (no double submits).
- **Done when:** you can't find a page that shows a blank screen or a raw error.

### Step 35 (DJ): End-to-end fixes

- Run backend and frontend together. Walk through the whole flow as each role (inspector, supervisor, admin), and check warehouse privacy with two inspectors from different warehouses.
- Fix every bug found. Keep fixes small and inside this one commit. If a fix needs a change to `docs/api.md`, update it and say so in the commit body.
- **Done when:** the full flow works in the browser for all three roles with no console errors.

### Step 36 (DJ): Final README

- Update `README.md` so a new person can run the project from scratch: prerequisites, `npm install` (root and `client/`), `.env` setup (`DATABASE_URL`, `JWT_SECRET`), `npm run db:setup`, running backend and frontend, the test accounts (emails, roles, password `Devanshi1234`), the API summary (link to `docs/api.md`), the engine summary, and a few screenshots in `docs/screenshots/`.
- Remove the old "health check only / not yet implemented" text.
- **Done when:** a teammate following only the README can get the app running and log in.

---

## 8. How to run the project

```bash
npm install
npm --prefix client install
cp .env.example .env          # then set DATABASE_URL and JWT_SECRET
npm run db:setup              # from step 05
npm run dev                   # backend on http://localhost:3000
npm run client:dev            # frontend on http://localhost:5173 (from step 07)
npm test
```

Log in with any seeded account (listed at the top of `dbms/04_seed.sql`) and the password `Devanshi1234`.
