// Needs a database set up with `npm run db:setup` and JWT_SECRET in .env.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/config/db');

const PASSWORD = 'Devanshi1234';
const SUPERVISOR_EMAIL = 'priya.sundaram@returnloop.internal';
const INSPECTOR_EMAIL = 'amit.kulkarni@returnloop.internal';
const TEST_REASON = 'returns.test.js';

let server;
let baseUrl;
let supervisor;
let inspector;

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

function create(body, token = supervisor.token) {
  return api('POST', '/returns', { token, body: { return_reason: TEST_REASON, ...body } });
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  supervisor = await login(SUPERVISOR_EMAIL);
  inspector = await login(INSPECTOR_EMAIL);
});

after(async () => {
  await db.query('DELETE FROM returns WHERE return_reason = $1', [TEST_REASON]);
  server.close();
  await db.end();
});

// ---------- GET /returns ----------

test('list returns a page with meta, newest first', async () => {
  const res = await api('GET', '/returns?limit=5', { token: supervisor.token });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 5);
  assert.equal(res.body.meta.page, 1);
  assert.equal(res.body.meta.limit, 5);
  assert.ok(res.body.meta.total >= 5);

  const created = res.body.data.map((r) => new Date(r.created_at).getTime());
  assert.deepEqual(created, [...created].sort((a, b) => b - a));
});

test('list item has the documented fields and number types', async () => {
  const res = await api('GET', '/returns?limit=1', { token: supervisor.token });
  const item = res.body.data[0];
  for (const field of [
    'return_id',
    'return_tracking_number',
    'product_id',
    'sku',
    'brand',
    'model_name',
    'category',
    'retail_price',
    'warehouse_id',
    'warehouse_code',
    'facility_name',
    'serial_number',
    'return_reason',
    'return_date',
    'status',
    'customer_comment',
    'created_at',
  ]) {
    assert.ok(field in item, `missing ${field}`);
  }
  assert.equal(typeof item.retail_price, 'number');
  assert.match(item.return_date, /^\d{4}-\d{2}-\d{2}$/);
});

test('pages do not overlap and cover the total', async () => {
  const first = await api('GET', '/returns?limit=4&page=1', { token: supervisor.token });
  const second = await api('GET', '/returns?limit=4&page=2', { token: supervisor.token });
  const ids1 = first.body.data.map((r) => r.return_id);
  const ids2 = second.body.data.map((r) => r.return_id);
  assert.equal(ids1.filter((id) => ids2.includes(id)).length, 0);
  assert.equal(second.body.meta.page, 2);
});

test('list filters by status', async () => {
  const res = await api('GET', '/returns?status=COMPLETED', { token: supervisor.token });
  assert.ok(res.body.data.length > 0);
  for (const item of res.body.data) {
    assert.equal(item.status, 'COMPLETED');
  }
});

test('list searches tracking and serial numbers case-insensitively', async () => {
  const byTracking = await api('GET', '/returns?q=ret-2026-0010', { token: supervisor.token });
  assert.deepEqual(
    byTracking.body.data.map((r) => r.return_tracking_number),
    ['RET-2026-0010']
  );

  const bySerial = await api('GET', '/returns?q=sn-dell', { token: supervisor.token });
  assert.equal(bySerial.body.data[0].return_tracking_number, 'RET-2026-0010');
});

test('list rejects bad query parameters with 400', async () => {
  for (const query of ['status=DONE', 'page=0', 'limit=abc', 'limit=101', 'warehouse_id=x']) {
    const res = await api('GET', `/returns?${query}`, { token: supervisor.token });
    assert.equal(res.status, 400, query);
    assert.ok(Array.isArray(res.body.errors), query);
  }
});

// ---------- GET /returns/:id ----------

test('detail of a completed return has every section filled', async () => {
  const res = await api('GET', '/returns/1', { token: supervisor.token });
  assert.equal(res.status, 200);

  const { data } = res.body;
  assert.deepEqual(Object.keys(data).sort(), [
    'alternatives',
    'decision',
    'inspections',
    'outcome',
    'return',
  ]);
  assert.equal(data.return.return_id, 1);
  assert.equal(data.return.status, 'COMPLETED');
  assert.ok(data.inspections.length >= 1);
  assert.equal(typeof data.inspections[0].inspector_name, 'string');
  assert.equal(typeof data.decision.decided_by_name, 'string');
  assert.equal(typeof data.decision.confidence_score, 'number');
  assert.ok(data.alternatives.length > 0);
  const ranks = data.alternatives.map((a) => a.rank_order);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  assert.equal(typeof data.outcome.actual_net_recovery, 'number');
});

test('detail of a received return has empty sections', async () => {
  const res = await api('GET', '/returns/14', { token: supervisor.token });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.return.status, 'RECEIVED');
  assert.deepEqual(res.body.data.inspections, []);
  assert.equal(res.body.data.decision, null);
  assert.deepEqual(res.body.data.alternatives, []);
  assert.equal(res.body.data.outcome, null);
});

test('detail rejects a non-numeric id and unknown ids', async () => {
  assert.equal((await api('GET', '/returns/abc', { token: supervisor.token })).status, 400);
  assert.equal((await api('GET', '/returns/12abc', { token: supervisor.token })).status, 400);
  assert.equal((await api('GET', '/returns/999999', { token: supervisor.token })).status, 404);
});

// ---------- POST /returns ----------

test('create starts as RECEIVED in the user warehouse with defaults', async () => {
  const res = await create({ product_id: 1 });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.status, 'RECEIVED');
  assert.equal(res.body.data.warehouse_id, supervisor.user.warehouse_id);
  assert.match(res.body.data.return_tracking_number, /^RET-\d+-\d{4}$/);
  assert.match(res.body.data.return_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(res.body.data.sku, 'SKU-APPL-IPH14-128');
});

test('create accepts sku and warehouse_code instead of IDs', async () => {
  const res = await create({ sku: 'SKU-SAMS-GS23-256', warehouse_code: 'WH-HYD-01' });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.product_id, 2);
  assert.equal(res.body.data.warehouse_code, 'WH-HYD-01');
});

test('create rejects status in the body', async () => {
  const res = await create({ product_id: 1, status: 'COMPLETED' });
  assert.equal(res.status, 400);
  assert.equal(res.body.errors[0].field, 'status');
});

test('create rejects unknown sku, warehouse code and ids with 400', async () => {
  const cases = [
    [{ sku: 'NO-SUCH-SKU' }, 'sku'],
    [{ product_id: 1, warehouse_code: 'WH-NOPE' }, 'warehouse_code'],
    [{ product_id: 99999 }, 'product_id'],
    [{ product_id: 1, warehouse_id: 99999 }, 'warehouse_id'],
  ];
  for (const [body, field] of cases) {
    const res = await create(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.body.errors[0].field, field, JSON.stringify(body));
  }
});

test('create validates required and typed fields', async () => {
  const res = await api('POST', '/returns', {
    token: supervisor.token,
    body: { product_id: 'one', return_date: '2999-01-01' },
  });
  assert.equal(res.status, 400);
  const fields = res.body.errors.map((e) => e.field);
  assert.ok(fields.includes('product_id'));
  assert.ok(fields.includes('return_reason'));
  assert.ok(fields.includes('return_date'));

  const noProduct = await create({});
  assert.equal(noProduct.status, 400);
  assert.equal(noProduct.body.errors[0].field, 'product_id');
});

test('create rejects a duplicate tracking number with 409', async () => {
  const res = await create({ product_id: 1, return_tracking_number: 'RET-2026-0001' });
  assert.equal(res.status, 409);
});

test('inspector creating without a warehouse lands in their own warehouse', async () => {
  const res = await create({ product_id: 1 }, inspector.token);
  assert.equal(res.status, 201);
  assert.equal(res.body.data.warehouse_id, inspector.user.warehouse_id);
});
