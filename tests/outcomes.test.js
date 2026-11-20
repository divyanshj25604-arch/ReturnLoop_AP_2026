// Outcome and cancel endpoints (docs/api.md 5.6.5, 5.6.6).
// Needs a database set up with `npm run db:setup` and JWT_SECRET in .env.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/config/db');

const PASSWORD = 'Devanshi1234';
const TEST_REASON = 'outcomes.test.js';

let server;
let baseUrl;
let inspector; // amit, warehouse 3
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

async function receivedReturn(comment) {
  const res = await api('POST', '/returns', {
    token: inspector.token,
    body: { product_id: 1, return_reason: TEST_REASON, customer_comment: comment },
  });
  return res.body.data.return_id;
}

async function evaluatedReturn() {
  const id = await receivedReturn();
  await api('POST', `/returns/${id}/inspections`, {
    token: inspector.token,
    body: { condition_grade: 'Good', functional_status: 'Fully Functional' },
  });
  return id;
}

// Returns { id, finalDisposition } for a DECIDED return.
async function decidedReturn() {
  const id = await evaluatedReturn();
  const preview = await api('GET', `/returns/${id}/recommendation`, { token: supervisor.token });
  const finalDisposition = preview.body.data.recommended_disposition;
  await api('POST', `/returns/${id}/decision`, {
    token: supervisor.token,
    body: { final_disposition: finalDisposition },
  });
  return { id, finalDisposition };
}

async function statusOf(returnId) {
  const result = await db.query('SELECT status FROM returns WHERE return_id = $1', [returnId]);
  return result.rows[0].status;
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  inspector = await login('amit.kulkarni@returnloop.internal');
  supervisor = await login('priya.sundaram@returnloop.internal');
});

after(async () => {
  // Outcomes block deleting their decision (ON DELETE RESTRICT), so remove them first.
  await db.query(
    `DELETE FROM decision_outcomes WHERE decision_id IN (
       SELECT d.decision_id FROM disposition_decisions d
       JOIN returns r ON r.return_id = d.return_id
       WHERE r.return_reason = $1)`,
    [TEST_REASON]
  );
  await db.query('DELETE FROM returns WHERE return_reason = $1', [TEST_REASON]);
  server.close();
  await db.end();
});

// ---------- outcome ----------

test('recording an outcome completes the return', async () => {
  const { id } = await decidedReturn();
  const res = await api('POST', `/returns/${id}/outcome`, {
    token: supervisor.token,
    body: {
      disposition_executed: 'Donate',
      actual_revenue: 0,
      actual_cost: 450,
      execution_partner: 'Shiksha Foundation',
      completion_date: '2026-11-20',
      outcome_notes: 'Picked up by NGO van',
    },
  });

  assert.equal(res.status, 201);
  const data = res.body.data;
  assert.equal(data.return_status, 'COMPLETED');
  assert.equal(data.disposition_executed, 'Donate');
  assert.equal(data.actual_cost, 450);
  assert.equal(data.actual_net_recovery, -450);
  assert.equal(data.completion_date, '2026-11-20');
  assert.equal(data.execution_partner, 'Shiksha Foundation');
  assert.equal(await statusOf(id), 'COMPLETED');

  const detail = await api('GET', `/returns/${id}`, { token: supervisor.token });
  assert.equal(detail.body.data.outcome.outcome_id, data.outcome_id);
});

test('disposition_executed defaults to the final disposition, date to today', async () => {
  const { id, finalDisposition } = await decidedReturn();
  const res = await api('POST', `/returns/${id}/outcome`, {
    token: supervisor.token,
    body: { actual_revenue: 30000, actual_cost: 500 },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.disposition_executed, finalDisposition);
  assert.equal(res.body.data.actual_net_recovery, 29500);
  assert.match(res.body.data.completion_date, /^\d{4}-\d{2}-\d{2}$/);
});

test('a second outcome gives 409', async () => {
  const { id } = await decidedReturn();
  const body = { actual_revenue: 100, actual_cost: 10 };
  assert.equal((await api('POST', `/returns/${id}/outcome`, { token: supervisor.token, body })).status, 201);
  assert.equal((await api('POST', `/returns/${id}/outcome`, { token: supervisor.token, body })).status, 409);
});

test('outcome needs a DECIDED return (409)', async () => {
  const id = await evaluatedReturn();
  const res = await api('POST', `/returns/${id}/outcome`, {
    token: supervisor.token,
    body: { actual_revenue: 100, actual_cost: 10 },
  });
  assert.equal(res.status, 409);
  assert.equal(await statusOf(id), 'EVALUATED');
});

test('outcome validates its fields', async () => {
  const { id } = await decidedReturn();
  const res = await api('POST', `/returns/${id}/outcome`, {
    token: supervisor.token,
    body: { disposition_executed: 'Burn', actual_revenue: -5, completion_date: '20-11-2026' },
  });
  assert.equal(res.status, 400);
  assert.deepEqual(
    res.body.errors.map((e) => e.field).sort(),
    ['actual_cost', 'actual_revenue', 'completion_date', 'disposition_executed']
  );
  assert.equal(await statusOf(id), 'DECIDED');
});

test('inspectors cannot record outcomes (403)', async () => {
  const { id } = await decidedReturn();
  const res = await api('POST', `/returns/${id}/outcome`, {
    token: inspector.token,
    body: { actual_revenue: 100, actual_cost: 10 },
  });
  assert.equal(res.status, 403);
});

// ---------- cancel ----------

test('cancel marks the return CANCELLED and records the reason', async () => {
  const id = await receivedReturn('Box was damaged');
  const res = await api('POST', `/returns/${id}/cancel`, {
    token: supervisor.token,
    body: { reason: 'Customer withdrew the return' },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, 'CANCELLED');
  assert.equal(
    res.body.data.customer_comment,
    'Box was damaged\n[Cancelled] Customer withdrew the return'
  );
});

test('cancel without an earlier comment writes just the reason', async () => {
  const id = await evaluatedReturn();
  const res = await api('POST', `/returns/${id}/cancel`, {
    token: supervisor.token,
    body: { reason: 'Duplicate entry' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.customer_comment, '[Cancelled] Duplicate entry');
});

test('cancel needs a reason', async () => {
  const id = await receivedReturn();
  const res = await api('POST', `/returns/${id}/cancel`, { token: supervisor.token, body: {} });
  assert.equal(res.status, 400);
  assert.equal(res.body.errors[0].field, 'reason');
  assert.equal(await statusOf(id), 'RECEIVED');
});

test('decided and cancelled returns cannot be cancelled (409)', async () => {
  const { id } = await decidedReturn();
  const decided = await api('POST', `/returns/${id}/cancel`, {
    token: supervisor.token,
    body: { reason: 'Too late' },
  });
  assert.equal(decided.status, 409);
  assert.equal(await statusOf(id), 'DECIDED');

  const other = await receivedReturn();
  const body = { reason: 'First time' };
  assert.equal((await api('POST', `/returns/${other}/cancel`, { token: supervisor.token, body })).status, 200);
  assert.equal((await api('POST', `/returns/${other}/cancel`, { token: supervisor.token, body })).status, 409);
});

test('inspectors cannot cancel returns (403)', async () => {
  const id = await receivedReturn();
  const res = await api('POST', `/returns/${id}/cancel`, {
    token: inspector.token,
    body: { reason: 'Not allowed' },
  });
  assert.equal(res.status, 403);
  assert.equal(await statusOf(id), 'RECEIVED');
});
