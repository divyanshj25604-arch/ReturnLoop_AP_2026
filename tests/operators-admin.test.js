// Operator admin endpoints (docs/api.md section 5.5).
// Needs a database set up with `npm run db:setup` and JWT_SECRET in .env.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/config/db');

const PASSWORD = 'Devanshi1234';
const PREFIX = 'TST-OP-';

let server;
let baseUrl;
let admin;
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

async function login(email, password = PASSWORD) {
  return api('POST', '/auth/login', { body: { email, password } });
}

const newOperator = (n) => ({
  employee_code: `${PREFIX}${n}`,
  full_name: `Test Operator ${n}`,
  email: `test.operator.${n}@returnloop.internal`,
  role: 'Reverse Logistics Technician',
  app_role: 'INSPECTOR',
  warehouse_id: 2,
  password: 'temporary-pass-1',
});

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  admin = (await login('rajesh.sharma@returnloop.internal')).body.data;
  supervisor = (await login('priya.sundaram@returnloop.internal')).body.data;
});

after(async () => {
  await db.query('DELETE FROM operators WHERE employee_code LIKE $1', [`${PREFIX}%`]);
  server.close();
  await db.end();
});

test('only admins can use operator endpoints', async () => {
  assert.equal((await api('GET', '/operators', { token: supervisor.token })).status, 403);
  assert.equal(
    (await api('POST', '/operators', { token: supervisor.token, body: newOperator(0) })).status,
    403
  );
  assert.equal(
    (await api('PATCH', '/operators/1', { token: supervisor.token, body: { role: 'x' } })).status,
    403
  );
  assert.equal((await api('GET', '/operators')).status, 401);
});

test('admin lists operators without password hashes, with filters', async () => {
  const all = await api('GET', '/operators', { token: admin.token });
  assert.equal(all.status, 200);
  assert.ok(all.body.data.length >= 5);
  assert.equal(JSON.stringify(all.body).includes('password_hash'), false);
  assert.ok('app_role' in all.body.data[0] && 'is_active' in all.body.data[0]);

  const inspectors = await api('GET', '/operators?app_role=INSPECTOR', { token: admin.token });
  assert.ok(inspectors.body.data.length > 0);
  assert.ok(inspectors.body.data.every((o) => o.app_role === 'INSPECTOR'));

  const wh1 = await api('GET', '/operators?warehouse_id=1&is_active=true', { token: admin.token });
  assert.ok(wh1.body.data.every((o) => o.warehouse_id === 1 && o.is_active));

  for (const query of ['app_role=OWNER', 'is_active=yes', 'warehouse_id=x']) {
    assert.equal((await api('GET', `/operators?${query}`, { token: admin.token })).status, 400, query);
  }
});

test('admin creates an operator who can then log in', async () => {
  const res = await api('POST', '/operators', { token: admin.token, body: newOperator(1) });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.app_role, 'INSPECTOR');
  assert.equal(res.body.data.is_active, true);
  assert.equal(JSON.stringify(res.body).includes('password'), false);

  const loggedIn = await login(newOperator(1).email, 'temporary-pass-1');
  assert.equal(loggedIn.status, 200);
  assert.equal(loggedIn.body.data.user.warehouse_id, 2);
});

test('create validates fields', async () => {
  const res = await api('POST', '/operators', {
    token: admin.token,
    body: { ...newOperator(2), email: 'not-an-email', app_role: 'BOSS', password: 'short' },
  });
  assert.equal(res.status, 400);
  const fields = res.body.errors.map((e) => e.field);
  for (const field of ['email', 'app_role', 'password']) {
    assert.ok(fields.includes(field), field);
  }

  const missing = await api('POST', '/operators', { token: admin.token, body: {} });
  assert.equal(missing.status, 400);
  assert.equal(missing.body.errors.length, 7);

  const badWarehouse = await api('POST', '/operators', {
    token: admin.token,
    body: { ...newOperator(3), warehouse_id: 99999 },
  });
  assert.equal(badWarehouse.status, 400);
  assert.equal(badWarehouse.body.errors[0].field, 'warehouse_id');
});

test('duplicate email or employee code gives 409', async () => {
  const dupEmail = await api('POST', '/operators', {
    token: admin.token,
    body: { ...newOperator(4), email: 'rajesh.sharma@returnloop.internal' },
  });
  assert.equal(dupEmail.status, 409);
  assert.match(dupEmail.body.message, /email/);

  const dupCode = await api('POST', '/operators', {
    token: admin.token,
    body: { ...newOperator(5), employee_code: 'OP-101' },
  });
  assert.equal(dupCode.status, 409);
  assert.match(dupCode.body.message, /employee_code/);
});

test('admin updates role, warehouse and password', async () => {
  const created = await api('POST', '/operators', { token: admin.token, body: newOperator(6) });
  const id = created.body.data.operator_id;

  const res = await api('PATCH', `/operators/${id}`, {
    token: admin.token,
    body: { app_role: 'SUPERVISOR', warehouse_id: 3, password: 'reset-password-9' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.app_role, 'SUPERVISOR');
  assert.equal(res.body.data.warehouse_id, 3);
  assert.equal(res.body.data.full_name, 'Test Operator 6');

  assert.equal((await login(newOperator(6).email, 'temporary-pass-1')).status, 401);
  assert.equal((await login(newOperator(6).email, 'reset-password-9')).status, 200);
});

test('a deactivated operator can no longer log in or use their token', async () => {
  const created = await api('POST', '/operators', { token: admin.token, body: newOperator(7) });
  const id = created.body.data.operator_id;
  const token = (await login(newOperator(7).email, 'temporary-pass-1')).body.data.token;

  const res = await api('PATCH', `/operators/${id}`, {
    token: admin.token,
    body: { is_active: false },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.is_active, false);

  assert.equal((await login(newOperator(7).email, 'temporary-pass-1')).status, 401);
  assert.equal((await api('GET', '/auth/me', { token })).status, 401);
});

test('an admin cannot deactivate themselves or drop their own ADMIN role', async () => {
  const self = admin.user.operator_id;

  const deactivate = await api('PATCH', `/operators/${self}`, {
    token: admin.token,
    body: { is_active: false },
  });
  assert.equal(deactivate.status, 409);

  const demote = await api('PATCH', `/operators/${self}`, {
    token: admin.token,
    body: { app_role: 'SUPERVISOR' },
  });
  assert.equal(demote.status, 409);

  const stillAdmin = await api('GET', '/auth/me', { token: admin.token });
  assert.equal(stillAdmin.body.data.app_role, 'ADMIN');

  // Changing other fields on yourself is fine.
  const rename = await api('PATCH', `/operators/${self}`, {
    token: admin.token,
    body: { full_name: admin.user.full_name },
  });
  assert.equal(rename.status, 200);
});

test('update rejects bad input and unknown operators', async () => {
  assert.equal(
    (await api('PATCH', '/operators/1', { token: admin.token, body: { is_active: 'no' } })).status,
    400
  );
  assert.equal(
    (await api('PATCH', '/operators/1', { token: admin.token, body: { password: 'short' } })).status,
    400
  );
  assert.equal(
    (await api('PATCH', '/operators/999999', { token: admin.token, body: { role: 'x' } })).status,
    404
  );
  assert.equal(
    (await api('PATCH', '/operators/abc', { token: admin.token, body: { role: 'x' } })).status,
    400
  );
});
