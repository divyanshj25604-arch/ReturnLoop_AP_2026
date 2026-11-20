// Needs a database set up with `npm run db:setup` and JWT_SECRET in .env.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/config/db');

const PASSWORD = 'Devanshi1234';
const INSPECTOR_EMAIL = 'amit.kulkarni@returnloop.internal'; // warehouse 3 (WH-MUM-01)
const SUPERVISOR_EMAIL = 'priya.sundaram@returnloop.internal'; // warehouse 2

let server;
let baseUrl;
let inspector;
let supervisor;
let ownReturnId;
let otherReturnId;
const createdReturnIds = [];

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

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  inspector = await login(INSPECTOR_EMAIL);
  supervisor = await login(SUPERVISOR_EMAIL);

  const own = await db.query('SELECT return_id FROM returns WHERE warehouse_id = $1 LIMIT 1', [
    inspector.user.warehouse_id,
  ]);
  const other = await db.query('SELECT return_id FROM returns WHERE warehouse_id <> $1 LIMIT 1', [
    inspector.user.warehouse_id,
  ]);
  ownReturnId = own.rows[0].return_id;
  otherReturnId = other.rows[0].return_id;
});

after(async () => {
  if (createdReturnIds.length > 0) {
    await db.query('DELETE FROM returns WHERE return_id = ANY($1::int[])', [createdReturnIds]);
  }
  server.close();
  await db.end();
});

test('inspector only lists returns from their own warehouse', async () => {
  const res = await api('GET', '/returns', { token: inspector.token });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.length > 0);
  for (const item of res.body.data) {
    assert.equal(item.warehouse_id, inspector.user.warehouse_id);
  }
});

test('inspector cannot widen the list with a warehouse_id filter', async () => {
  const res = await api('GET', `/returns?warehouse_id=1`, { token: inspector.token });
  assert.equal(res.status, 200);
  for (const item of res.body.data) {
    assert.equal(item.warehouse_id, inspector.user.warehouse_id);
  }
});

test('supervisor lists returns from every warehouse and can filter', async () => {
  const all = await api('GET', '/returns', { token: supervisor.token });
  const warehouses = new Set(all.body.data.map((r) => r.warehouse_id));
  assert.ok(warehouses.size > 1);

  const filtered = await api('GET', '/returns?warehouse_id=1', { token: supervisor.token });
  assert.ok(filtered.body.data.length > 0);
  for (const item of filtered.body.data) {
    assert.equal(item.warehouse_id, 1);
  }
});

test('inspector can open their own warehouse return', async () => {
  const res = await api('GET', `/returns/${ownReturnId}`, { token: inspector.token });
  assert.equal(res.status, 200);
});

test("inspector gets 404 for another warehouse's return, same as a missing one", async () => {
  const other = await api('GET', `/returns/${otherReturnId}`, { token: inspector.token });
  assert.equal(other.status, 404);
  assert.deepEqual(other.body, {
    success: false,
    message: `Return with ID ${otherReturnId} not found`,
  });

  const missing = await api('GET', '/returns/999999', { token: inspector.token });
  assert.equal(missing.status, 404);
});

test("supervisor can open another warehouse's return", async () => {
  const res = await api('GET', `/returns/${otherReturnId}`, { token: supervisor.token });
  assert.equal(res.status, 200);
});

test('inspector gets 403 when creating a return for another warehouse', async () => {
  const byId = await api('POST', '/returns', {
    token: inspector.token,
    body: { product_id: 1, warehouse_id: 1, return_reason: 'Privacy test' },
  });
  assert.equal(byId.status, 403);

  const byCode = await api('POST', '/returns', {
    token: inspector.token,
    body: { product_id: 1, warehouse_code: 'WH-DEL-01', return_reason: 'Privacy test' },
  });
  assert.equal(byCode.status, 403);
});

test('inspector return without a warehouse goes to their own warehouse', async () => {
  const res = await api('POST', '/returns', {
    token: inspector.token,
    body: { product_id: 1, return_reason: 'Privacy test' },
  });
  assert.equal(res.status, 201);
  createdReturnIds.push(res.body.data.return_id);
  assert.equal(res.body.data.warehouse_id, inspector.user.warehouse_id);
});

test('supervisor can create a return for any warehouse', async () => {
  const res = await api('POST', '/returns', {
    token: supervisor.token,
    body: { product_id: 1, warehouse_id: 4, return_reason: 'Privacy test' },
  });
  assert.equal(res.status, 201);
  createdReturnIds.push(res.body.data.return_id);
  assert.equal(res.body.data.warehouse_id, 4);
});
