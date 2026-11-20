// Recommendation preview and decision endpoints (docs/api.md 5.6.3, 5.6.4).
// Needs a database set up with `npm run db:setup` and JWT_SECRET in .env.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/config/db');
const { DISPOSITIONS } = require('../src/utils/constants');

const PASSWORD = 'Devanshi1234';
const TEST_REASON = 'decisions.test.js';

let server;
let baseUrl;
let inspector; // amit, warehouse 3
let otherInspector; // sneha, warehouse 4
let supervisor;

async function api(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function login(email) {
  const res = await api('POST', '/auth/login', { body: { email, password: PASSWORD } });
  return res.body.data;
}

const PRISTINE = {
  condition_grade: 'Excellent',
  functional_status: 'Fully Functional',
  has_original_packaging: true,
  has_all_accessories: true,
  repair_estimate: 0,
};

const BROKEN = {
  condition_grade: 'Damaged',
  functional_status: 'Non-functional',
  repair_estimate: 999999,
};

// A return in warehouse 3, inspected and EVALUATED.
async function evaluatedReturn(inspection = PRISTINE) {
  const created = await api('POST', '/returns', {
    token: inspector.token,
    body: { product_id: 1, return_reason: TEST_REASON },
  });
  const id = created.body.data.return_id;
  await api('POST', `/returns/${id}/inspections`, { token: inspector.token, body: inspection });
  return id;
}

async function statusOf(returnId) {
  const result = await db.query('SELECT status FROM returns WHERE return_id = $1', [returnId]);
  return result.rows[0].status;
}

async function countSaved(returnId) {
  const result = await db.query(
    `SELECT count(DISTINCT d.decision_id)::int AS decisions, count(a.alternative_id)::int AS alternatives
     FROM disposition_decisions d
     LEFT JOIN decision_alternatives a ON a.decision_id = d.decision_id
     WHERE d.return_id = $1`,
    [returnId]
  );
  return result.rows[0];
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  inspector = await login('amit.kulkarni@returnloop.internal');
  otherInspector = await login('sneha.reddy@returnloop.internal');
  supervisor = await login('priya.sundaram@returnloop.internal');
});

after(async () => {
  await db.query('DELETE FROM returns WHERE return_reason = $1', [TEST_REASON]);
  server.close();
  await db.end();
});

// ---------- GET /recommendation ----------

test('recommendation ranks all six options and saves nothing', async () => {
  const id = await evaluatedReturn();
  const res = await api('GET', `/returns/${id}/recommendation`, { token: inspector.token });

  assert.equal(res.status, 200);
  const data = res.body.data;
  assert.equal(data.return_id, id);
  assert.equal(typeof data.inspection_id, 'number');
  assert.ok(data.confidence_score >= 0 && data.confidence_score <= 1);

  assert.equal(data.alternatives.length, 6);
  assert.deepEqual(data.alternatives.map((a) => a.disposition_type).sort(), [...DISPOSITIONS].sort());
  assert.deepEqual(data.alternatives.map((a) => a.rank_order), [1, 2, 3, 4, 5, 6]);
  const recommended = data.alternatives.filter((a) => a.is_recommended);
  assert.equal(recommended.length, 1);
  assert.equal(recommended[0].disposition_type, data.recommended_disposition);
  assert.equal(recommended[0].rank_order, 1);

  assert.deepEqual(await countSaved(id), { decisions: 0, alternatives: 0 });
  assert.equal(await statusOf(id), 'EVALUATED');
});

test('recommendation uses the newest inspection', async () => {
  const id = await evaluatedReturn(PRISTINE);
  const before = await api('GET', `/returns/${id}/recommendation`, { token: inspector.token });

  await api('POST', `/returns/${id}/inspections`, { token: inspector.token, body: BROKEN });
  const after = await api('GET', `/returns/${id}/recommendation`, { token: inspector.token });

  assert.notEqual(after.body.data.inspection_id, before.body.data.inspection_id);
  assert.notEqual(after.body.data.recommended_disposition, before.body.data.recommended_disposition);
  assert.ok(['Recycle', 'Write-off'].includes(after.body.data.recommended_disposition));
});

test('recommendation needs an EVALUATED return (409)', async () => {
  const created = await api('POST', '/returns', {
    token: inspector.token,
    body: { product_id: 1, return_reason: TEST_REASON },
  });
  const res = await api('GET', `/returns/${created.body.data.return_id}/recommendation`, {
    token: inspector.token,
  });
  assert.equal(res.status, 409);
});

test("another warehouse's inspector gets 404 on recommendation", async () => {
  const id = await evaluatedReturn();
  const res = await api('GET', `/returns/${id}/recommendation`, { token: otherInspector.token });
  assert.equal(res.status, 404);
});

// ---------- POST /decision ----------

test('accepting the recommendation saves the decision and six alternatives', async () => {
  const id = await evaluatedReturn();
  const preview = await api('GET', `/returns/${id}/recommendation`, { token: supervisor.token });
  const pick = preview.body.data.recommended_disposition;

  const res = await api('POST', `/returns/${id}/decision`, {
    token: supervisor.token,
    body: { final_disposition: pick, override_reason: 'ignored when not an override' },
  });

  assert.equal(res.status, 201);
  const { decision, alternatives, return_status } = res.body.data;
  assert.equal(return_status, 'DECIDED');
  assert.equal(decision.return_id, id);
  assert.equal(decision.recommended_disposition, pick);
  assert.equal(decision.final_disposition, pick);
  assert.equal(decision.is_override, false);
  assert.equal(decision.override_reason, null);
  assert.equal(decision.confidence_score, preview.body.data.confidence_score);
  assert.equal(decision.decided_by_operator_id, supervisor.user.operator_id);
  assert.equal(decision.decided_by_name, supervisor.user.full_name);

  assert.equal(alternatives.length, 6);
  assert.ok(alternatives.every((a) => typeof a.alternative_id === 'number'));
  assert.deepEqual(alternatives.map((a) => a.rank_order), [1, 2, 3, 4, 5, 6]);
  for (const alt of alternatives) {
    assert.equal(
      alt.net_expected_recovery,
      Math.round((alt.estimated_revenue - alt.estimated_cost) * 100) / 100
    );
  }

  assert.equal(await statusOf(id), 'DECIDED');
  assert.deepEqual(await countSaved(id), { decisions: 1, alternatives: 6 });

  const detail = await api('GET', `/returns/${id}`, { token: supervisor.token });
  assert.equal(detail.body.data.decision.decision_id, decision.decision_id);
  assert.equal(detail.body.data.alternatives.length, 6);
});

test('an override needs a reason, and nothing is saved without one', async () => {
  const id = await evaluatedReturn();
  const preview = await api('GET', `/returns/${id}/recommendation`, { token: supervisor.token });
  const other = DISPOSITIONS.find((d) => d !== preview.body.data.recommended_disposition);

  const noReason = await api('POST', `/returns/${id}/decision`, {
    token: supervisor.token,
    body: { final_disposition: other },
  });
  assert.equal(noReason.status, 400);
  assert.equal(noReason.body.errors[0].field, 'override_reason');
  assert.equal(await statusOf(id), 'EVALUATED');
  assert.deepEqual(await countSaved(id), { decisions: 0, alternatives: 0 });

  const withReason = await api('POST', `/returns/${id}/decision`, {
    token: supervisor.token,
    body: { final_disposition: other, override_reason: 'Partner NGO requested this model' },
  });
  assert.equal(withReason.status, 201);
  assert.equal(withReason.body.data.decision.is_override, true);
  assert.equal(withReason.body.data.decision.final_disposition, other);
  assert.equal(withReason.body.data.decision.override_reason, 'Partner NGO requested this model');
});

test('a second decision on the same return gives 409', async () => {
  const id = await evaluatedReturn();
  const preview = await api('GET', `/returns/${id}/recommendation`, { token: supervisor.token });
  const body = { final_disposition: preview.body.data.recommended_disposition };

  assert.equal((await api('POST', `/returns/${id}/decision`, { token: supervisor.token, body })).status, 201);
  assert.equal((await api('POST', `/returns/${id}/decision`, { token: supervisor.token, body })).status, 409);
  assert.deepEqual(await countSaved(id), { decisions: 1, alternatives: 6 });
});

test('inspectors cannot make decisions (403)', async () => {
  const id = await evaluatedReturn();
  const res = await api('POST', `/returns/${id}/decision`, {
    token: inspector.token,
    body: { final_disposition: 'Resell' },
  });
  assert.equal(res.status, 403);
  assert.equal(await statusOf(id), 'EVALUATED');
});

test('decision validates final_disposition and needs an EVALUATED return', async () => {
  const id = await evaluatedReturn();
  const bad = await api('POST', `/returns/${id}/decision`, {
    token: supervisor.token,
    body: { final_disposition: 'Sell on eBay' },
  });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.errors[0].field, 'final_disposition');

  const received = await api('POST', '/returns', {
    token: inspector.token,
    body: { product_id: 1, return_reason: TEST_REASON },
  });
  const wrongStatus = await api('POST', `/returns/${received.body.data.return_id}/decision`, {
    token: supervisor.token,
    body: { final_disposition: 'Resell' },
  });
  assert.equal(wrongStatus.status, 409);

  const missing = await api('POST', '/returns/999999/decision', {
    token: supervisor.token,
    body: { final_disposition: 'Resell' },
  });
  assert.equal(missing.status, 404);
});
