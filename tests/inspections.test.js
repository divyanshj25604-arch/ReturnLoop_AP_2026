// Start-inspection and inspection endpoints (docs/api.md 5.6.1, 5.6.2).
// Needs a database set up with `npm run db:setup` and JWT_SECRET in .env.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/config/db');

const PASSWORD = 'Devanshi1234';
const TEST_REASON = 'inspections.test.js';

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

// A fresh RECEIVED return in the inspector's warehouse.
async function newReturn() {
  const res = await api('POST', '/returns', {
    token: inspector.token,
    body: { product_id: 1, return_reason: TEST_REASON },
  });
  return res.body.data.return_id;
}

const validInspection = {
  condition_grade: 'Good',
  functional_status: 'Minor Glitch',
  has_original_packaging: true,
  has_all_accessories: false,
  repair_estimate: 2500,
  diagnostic_notes: 'Display connector loose',
};

async function statusOf(returnId) {
  const result = await db.query('SELECT status FROM returns WHERE return_id = $1', [returnId]);
  return result.rows[0].status;
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

// ---------- start-inspection ----------

test('start-inspection moves RECEIVED to UNDER_INSPECTION', async () => {
  const id = await newReturn();
  const res = await api('POST', `/returns/${id}/start-inspection`, { token: inspector.token });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.return_id, id);
  assert.equal(res.body.data.status, 'UNDER_INSPECTION');
  assert.equal(await statusOf(id), 'UNDER_INSPECTION');
});

test('start-inspection twice gives 409', async () => {
  const id = await newReturn();
  await api('POST', `/returns/${id}/start-inspection`, { token: inspector.token });
  const again = await api('POST', `/returns/${id}/start-inspection`, { token: inspector.token });
  assert.equal(again.status, 409);
  assert.equal(await statusOf(id), 'UNDER_INSPECTION');
});

test("another warehouse's inspector gets 404 on start-inspection", async () => {
  const id = await newReturn();
  const res = await api('POST', `/returns/${id}/start-inspection`, {
    token: otherInspector.token,
  });
  assert.equal(res.status, 404);
  assert.equal(await statusOf(id), 'RECEIVED');
});

// ---------- inspections ----------

test('recording an inspection saves it and moves the return to EVALUATED', async () => {
  const id = await newReturn();
  await api('POST', `/returns/${id}/start-inspection`, { token: inspector.token });

  const res = await api('POST', `/returns/${id}/inspections`, {
    token: inspector.token,
    body: validInspection,
  });

  assert.equal(res.status, 201);
  const data = res.body.data;
  assert.equal(data.return_status, 'EVALUATED');
  assert.equal(data.inspector_id, inspector.user.operator_id);
  assert.equal(data.inspector_name, inspector.user.full_name);
  assert.equal(data.condition_grade, 'Good');
  assert.equal(data.functional_status, 'Minor Glitch');
  assert.equal(data.repair_estimate, 2500);
  assert.equal(data.has_original_packaging, true);
  assert.equal(await statusOf(id), 'EVALUATED');

  const detail = await api('GET', `/returns/${id}`, { token: inspector.token });
  assert.equal(detail.body.data.inspections[0].inspection_id, data.inspection_id);
});

test('an inspection can be recorded straight from RECEIVED, with defaults', async () => {
  const id = await newReturn();
  const res = await api('POST', `/returns/${id}/inspections`, {
    token: inspector.token,
    body: { condition_grade: 'Excellent', functional_status: 'Fully Functional' },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.has_original_packaging, false);
  assert.equal(res.body.data.has_all_accessories, false);
  assert.equal(res.body.data.repair_estimate, 0);
  assert.equal(await statusOf(id), 'EVALUATED');
});

test('re-inspecting an EVALUATED return adds a newer inspection', async () => {
  const id = await newReturn();
  await api('POST', `/returns/${id}/inspections`, { token: inspector.token, body: validInspection });
  const second = await api('POST', `/returns/${id}/inspections`, {
    token: supervisor.token,
    body: { condition_grade: 'Fair', functional_status: 'Defective Hardware', repair_estimate: 9000 },
  });
  assert.equal(second.status, 201);

  const detail = await api('GET', `/returns/${id}`, { token: supervisor.token });
  assert.equal(detail.body.data.inspections.length, 2);
  assert.equal(detail.body.data.inspections[0].inspection_id, second.body.data.inspection_id);
  assert.equal(detail.body.data.inspections[0].inspector_name, supervisor.user.full_name);
});

test('invalid inspection values give 400 and change nothing', async () => {
  const id = await newReturn();
  const res = await api('POST', `/returns/${id}/inspections`, {
    token: inspector.token,
    body: {
      condition_grade: 'Mint',
      functional_status: 'Works',
      repair_estimate: -1,
      has_all_accessories: 'yes',
    },
  });
  assert.equal(res.status, 400);
  assert.deepEqual(
    res.body.errors.map((e) => e.field).sort(),
    ['condition_grade', 'functional_status', 'has_all_accessories', 'repair_estimate']
  );
  assert.equal(await statusOf(id), 'RECEIVED');

  const missing = await api('POST', `/returns/${id}/inspections`, {
    token: inspector.token,
    body: {},
  });
  assert.equal(missing.status, 400);
});

test('decided, completed and cancelled returns cannot be inspected (409)', async () => {
  const seeded = await db.query(
    `SELECT DISTINCT ON (status) return_id, status FROM returns
     WHERE status IN ('DECIDED', 'COMPLETED', 'CANCELLED')
     ORDER BY status, return_id`
  );
  assert.equal(seeded.rows.length, 3);
  for (const { return_id, status } of seeded.rows) {
    const res = await api('POST', `/returns/${return_id}/inspections`, {
      token: supervisor.token,
      body: validInspection,
    });
    assert.equal(res.status, 409, status);
    assert.equal(await statusOf(return_id), status);
  }
});

test("another warehouse's inspector gets 404 when inspecting", async () => {
  const id = await newReturn();
  const res = await api('POST', `/returns/${id}/inspections`, {
    token: otherInspector.token,
    body: validInspection,
  });
  assert.equal(res.status, 404);
  assert.equal(await statusOf(id), 'RECEIVED');
});

test('workflow endpoints reject bad ids and missing tokens', async () => {
  assert.equal(
    (await api('POST', '/returns/abc/start-inspection', { token: inspector.token })).status,
    400
  );
  assert.equal(
    (await api('POST', '/returns/999999/inspections', {
      token: supervisor.token,
      body: validInspection,
    })).status,
    404
  );
  assert.equal((await api('POST', '/returns/1/start-inspection')).status, 401);
});
