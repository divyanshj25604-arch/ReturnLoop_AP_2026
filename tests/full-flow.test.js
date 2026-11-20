// End-to-end API tests: one return through the whole lifecycle, the role
// rules for every protected endpoint, and warehouse privacy at every stage.
//
// Needs a database set up with `npm run db:setup` and JWT_SECRET in .env.
// Everything this file creates is deleted in after(). If a run is ever
// interrupted, `npm run db:setup` resets the database to the seed data.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/config/db');

const PASSWORD = 'Devanshi1234';
const TEST_REASON = 'full-flow.test.js';

const ACCOUNTS = {
  ADMIN: 'rajesh.sharma@returnloop.internal',
  SUPERVISOR: 'priya.sundaram@returnloop.internal',
  INSPECTOR: 'amit.kulkarni@returnloop.internal', // warehouse 3
  OTHER_INSPECTOR: 'sneha.reddy@returnloop.internal', // warehouse 4
};

let server;
let baseUrl;
const users = {};

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

async function statusOf(returnId) {
  const result = await db.query('SELECT status FROM returns WHERE return_id = $1', [returnId]);
  return result.rows[0].status;
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  for (const [key, email] of Object.entries(ACCOUNTS)) {
    const res = await api('POST', '/auth/login', { body: { email, password: PASSWORD } });
    assert.equal(res.status, 200, `login failed for ${email}`);
    users[key] = res.body.data;
  }
});

after(async () => {
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

// ---------------------------------------------------------------------------
// 1. The full lifecycle, checking the status after every stage.
// ---------------------------------------------------------------------------

test('a return goes RECEIVED -> UNDER_INSPECTION -> EVALUATED -> DECIDED -> COMPLETED', async () => {
  const inspector = users.INSPECTOR;
  const supervisor = users.SUPERVISOR;

  // Inspector logs the return (warehouse defaults to their own).
  const created = await api('POST', '/returns', {
    token: inspector.token,
    body: {
      sku: 'SKU-APPL-IPH14-128',
      serial_number: 'FLOW-TEST-0001',
      return_reason: TEST_REASON,
      customer_comment: 'Screen flickers after two days',
    },
  });
  assert.equal(created.status, 201);
  const id = created.body.data.return_id;
  assert.equal(created.body.data.status, 'RECEIVED');
  assert.equal(created.body.data.warehouse_id, inspector.user.warehouse_id);
  assert.equal(await statusOf(id), 'RECEIVED');

  // Shows up in the inspector's list.
  const listed = await api('GET', '/returns?q=FLOW-TEST-0001', { token: inspector.token });
  assert.deepEqual(listed.body.data.map((r) => r.return_id), [id]);

  // Inspector starts the inspection.
  const started = await api('POST', `/returns/${id}/start-inspection`, { token: inspector.token });
  assert.equal(started.status, 200);
  assert.equal(await statusOf(id), 'UNDER_INSPECTION');

  // Inspector records it.
  const inspected = await api('POST', `/returns/${id}/inspections`, {
    token: inspector.token,
    body: {
      condition_grade: 'Good',
      functional_status: 'Minor Glitch',
      has_original_packaging: true,
      has_all_accessories: true,
      repair_estimate: 2500,
      diagnostic_notes: 'Display connector loose',
    },
  });
  assert.equal(inspected.status, 201);
  assert.equal(await statusOf(id), 'EVALUATED');

  // Anyone who can see the return can preview the recommendation.
  const preview = await api('GET', `/returns/${id}/recommendation`, { token: inspector.token });
  assert.equal(preview.status, 200);
  assert.equal(preview.body.data.alternatives.length, 6);
  assert.equal(preview.body.data.inspection_id, inspected.body.data.inspection_id);
  const recommended = preview.body.data.recommended_disposition;
  assert.equal(await statusOf(id), 'EVALUATED');

  // Inspector may not decide; supervisor accepts the recommendation.
  assert.equal(
    (await api('POST', `/returns/${id}/decision`, {
      token: inspector.token,
      body: { final_disposition: recommended },
    })).status,
    403
  );
  const decided = await api('POST', `/returns/${id}/decision`, {
    token: supervisor.token,
    body: { final_disposition: recommended },
  });
  assert.equal(decided.status, 201);
  assert.equal(decided.body.data.decision.is_override, false);
  assert.equal(await statusOf(id), 'DECIDED');

  // Supervisor records what happened.
  const completed = await api('POST', `/returns/${id}/outcome`, {
    token: supervisor.token,
    body: {
      actual_revenue: 42000,
      actual_cost: 3100,
      execution_partner: 'ReNew Electronics',
      outcome_notes: 'Refurbished and sold',
    },
  });
  assert.equal(completed.status, 201);
  assert.equal(completed.body.data.disposition_executed, recommended);
  assert.equal(completed.body.data.actual_net_recovery, 38900);
  assert.equal(await statusOf(id), 'COMPLETED');

  // The detail page now has every section, consistent with what was saved.
  const detail = await api('GET', `/returns/${id}`, { token: inspector.token });
  assert.equal(detail.status, 200);
  const data = detail.body.data;
  assert.equal(data.return.status, 'COMPLETED');
  assert.equal(data.inspections.length, 1);
  assert.equal(data.decision.final_disposition, recommended);
  assert.equal(data.decision.decided_by_name, supervisor.user.full_name);
  assert.equal(data.alternatives.length, 6);
  assert.equal(data.outcome.actual_net_recovery, 38900);

  // A completed return is locked: no more inspections, decisions, outcomes or cancelling.
  const locked = [
    ['POST', `/returns/${id}/start-inspection`, undefined],
    ['POST', `/returns/${id}/inspections`, { condition_grade: 'Good', functional_status: 'Minor Glitch' }],
    ['POST', `/returns/${id}/decision`, { final_disposition: 'Recycle', override_reason: 'x' }],
    ['POST', `/returns/${id}/outcome`, { actual_revenue: 1, actual_cost: 1 }],
    ['POST', `/returns/${id}/cancel`, { reason: 'x' }],
    ['GET', `/returns/${id}/recommendation`, undefined],
  ];
  for (const [method, path, body] of locked) {
    const res = await api(method, path, { token: supervisor.token, body });
    assert.equal(res.status, 409, `${method} ${path}`);
  }
  assert.equal(await statusOf(id), 'COMPLETED');
});

test('the dashboard reflects a return that completes', async () => {
  const supervisor = users.SUPERVISOR;
  const start = (await api('GET', '/dashboard', { token: supervisor.token })).body.data;

  const created = await api('POST', '/returns', {
    token: supervisor.token,
    body: { product_id: 2, warehouse_id: 2, return_reason: TEST_REASON },
  });
  const id = created.body.data.return_id;
  await api('POST', `/returns/${id}/inspections`, {
    token: supervisor.token,
    body: { condition_grade: 'Excellent', functional_status: 'Fully Functional' },
  });
  const preview = await api('GET', `/returns/${id}/recommendation`, { token: supervisor.token });
  const other = preview.body.data.alternatives.find((a) => !a.is_recommended).disposition_type;
  await api('POST', `/returns/${id}/decision`, {
    token: supervisor.token,
    body: { final_disposition: other, override_reason: 'Testing an override' },
  });
  await api('POST', `/returns/${id}/outcome`, {
    token: supervisor.token,
    body: { actual_revenue: 1000, actual_cost: 100 },
  });

  const end = (await api('GET', '/dashboard', { token: supervisor.token })).body.data;
  assert.equal(end.returns_by_status.COMPLETED, start.returns_by_status.COMPLETED + 1);
  assert.equal(end.decisions_by_disposition[other], start.decisions_by_disposition[other] + 1);
  assert.equal(
    Math.round((end.total_actual_recovery - start.total_actual_recovery) * 100) / 100,
    900
  );
  assert.ok(end.override_rate > start.override_rate);
  assert.equal(end.recent_returns[0].return_id, id);
});

// ---------------------------------------------------------------------------
// 2. Role rules: every protected endpoint, one role below and at its minimum.
//    Requests use invalid bodies, so allowed roles get 400 (or 200 for reads)
//    and nothing is changed.
// ---------------------------------------------------------------------------

const ROLE_RULES = [
  // [method, path, body, minimum role]
  ['GET', '/dashboard', undefined, 'SUPERVISOR'],
  ['POST', '/returns/1/decision', {}, 'SUPERVISOR'],
  ['POST', '/returns/1/outcome', {}, 'SUPERVISOR'],
  ['POST', '/returns/1/cancel', {}, 'SUPERVISOR'],
  ['POST', '/products', {}, 'ADMIN'],
  ['PATCH', '/products/1', { retail_price: -1 }, 'ADMIN'],
  ['POST', '/warehouses', {}, 'ADMIN'],
  ['PATCH', '/warehouses/1', { capacity: 0 }, 'ADMIN'],
  ['GET', '/operators', undefined, 'ADMIN'],
  ['POST', '/operators', {}, 'ADMIN'],
  ['PATCH', '/operators/2', { is_active: 'no' }, 'ADMIN'],
];

const ROLE_ORDER = ['INSPECTOR', 'SUPERVISOR', 'ADMIN'];

test('every protected endpoint returns 403 below its minimum role', async () => {
  for (const [method, path, body, minRole] of ROLE_RULES) {
    for (const role of ROLE_ORDER.slice(0, ROLE_ORDER.indexOf(minRole))) {
      const res = await api(method, path, { token: users[role].token, body });
      assert.equal(res.status, 403, `${role} ${method} ${path}`);
    }
  }
});

test('every protected endpoint lets its minimum role and above through', async () => {
  for (const [method, path, body, minRole] of ROLE_RULES) {
    for (const role of ROLE_ORDER.slice(ROLE_ORDER.indexOf(minRole))) {
      const res = await api(method, path, { token: users[role].token, body });
      assert.notEqual(res.status, 403, `${role} ${method} ${path}`);
      assert.notEqual(res.status, 401, `${role} ${method} ${path}`);
      assert.ok([200, 400].includes(res.status), `${role} ${method} ${path} gave ${res.status}`);
    }
  }
});

test('every endpoint except health and login needs a token', async () => {
  const endpoints = [
    ['GET', '/auth/me'],
    ['PATCH', '/auth/password'],
    ['GET', '/products'],
    ['GET', '/warehouses'],
    ['GET', '/returns'],
    ['POST', '/returns'],
    ['GET', '/returns/1'],
    ['POST', '/returns/1/start-inspection'],
    ['POST', '/returns/1/inspections'],
    ['GET', '/returns/1/recommendation'],
    ...ROLE_RULES.map(([method, path]) => [method, path]),
  ];
  for (const [method, path] of endpoints) {
    const res = await api(method, path, { body: method === 'GET' ? undefined : {} });
    assert.equal(res.status, 401, `${method} ${path}`);
  }
  assert.equal((await api('GET', '/health')).status, 200);
});

// ---------------------------------------------------------------------------
// 3. Warehouse privacy at every stage of the workflow.
// ---------------------------------------------------------------------------

test("an inspector from another warehouse gets 404 at every stage", async () => {
  const own = users.INSPECTOR;
  const other = users.OTHER_INSPECTOR.token;

  const created = await api('POST', '/returns', {
    token: own.token,
    body: { product_id: 1, return_reason: TEST_REASON },
  });
  const id = created.body.data.return_id;

  const attempts = [
    ['GET', `/returns/${id}`, undefined],
    ['POST', `/returns/${id}/start-inspection`, undefined],
    ['POST', `/returns/${id}/inspections`, { condition_grade: 'Good', functional_status: 'Minor Glitch' }],
  ];
  for (const [method, path, body] of attempts) {
    assert.equal((await api(method, path, { token: other, body })).status, 404, `${method} ${path}`);
  }

  await api('POST', `/returns/${id}/inspections`, {
    token: own.token,
    body: { condition_grade: 'Good', functional_status: 'Minor Glitch' },
  });
  assert.equal(
    (await api('GET', `/returns/${id}/recommendation`, { token: other })).status,
    404
  );

  const list = await api('GET', '/returns?limit=100', { token: other });
  assert.ok(list.body.data.every((r) => r.return_id !== id));
  assert.equal(await statusOf(id), 'EVALUATED');
});
