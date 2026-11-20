// Needs a database set up with `npm run db:setup` and JWT_SECRET in .env.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const db = require('../src/config/db');
const env = require('../src/config/env');
const { requireRole, hasRole } = require('../src/middleware/auth');

const PASSWORD = 'Devanshi1234';
const INSPECTOR_EMAIL = 'amit.kulkarni@returnloop.internal';

let server;
let baseUrl;
let inspectorToken;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: INSPECTOR_EMAIL, password: PASSWORD }),
  });
  inspectorToken = (await res.json()).data.token;
});

after(async () => {
  server.close();
  await db.end();
});

function get(path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return fetch(`${baseUrl}/api${path}`, { headers });
}

const PROTECTED = ['/products', '/products/1', '/returns', '/returns/1'];

test('protected routes return 401 without a token', async () => {
  for (const path of PROTECTED) {
    const res = await get(path);
    assert.equal(res.status, 401, path);
    assert.deepEqual(await res.json(), {
      success: false,
      message: 'Missing, invalid or expired token',
    });
  }
});

test('protected routes work with a valid token', async () => {
  for (const path of PROTECTED) {
    const res = await get(path, inspectorToken);
    assert.equal(res.status, 200, path);
  }
});

test('expired and wrongly signed tokens are rejected', async () => {
  const expired = jwt.sign({ sub: 1, role: 'ADMIN', warehouse_id: 1 }, env.jwt.secret, {
    algorithm: 'HS256',
    expiresIn: -10,
  });
  const forged = jwt.sign({ sub: 1, role: 'ADMIN', warehouse_id: 1 }, 'some-other-secret', {
    algorithm: 'HS256',
  });
  assert.equal((await get('/products', expired)).status, 401);
  assert.equal((await get('/products', forged)).status, 401);
  assert.equal((await get('/products', 'garbage')).status, 401);
});

test('a token stops working once the operator is deactivated', async () => {
  await db.query('UPDATE operators SET is_active = FALSE WHERE email = $1', [INSPECTOR_EMAIL]);
  try {
    assert.equal((await get('/products', inspectorToken)).status, 401);
  } finally {
    await db.query('UPDATE operators SET is_active = TRUE WHERE email = $1', [INSPECTOR_EMAIL]);
  }
  assert.equal((await get('/products', inspectorToken)).status, 200);
});

test('health and login stay public', async () => {
  assert.equal((await get('/health')).status, 200);
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: INSPECTOR_EMAIL, password: 'wrong-password' }),
  });
  assert.equal(res.status, 401);
});

test('hasRole follows INSPECTOR < SUPERVISOR < ADMIN', () => {
  assert.equal(hasRole('ADMIN', 'SUPERVISOR'), true);
  assert.equal(hasRole('SUPERVISOR', 'SUPERVISOR'), true);
  assert.equal(hasRole('INSPECTOR', 'SUPERVISOR'), false);
  assert.equal(hasRole('UNKNOWN', 'INSPECTOR'), false);
});

test('requireRole returns 403 when the role is too low', () => {
  const check = requireRole('SUPERVISOR');
  const results = [];
  const next = (err) => results.push(err);

  check({ user: { app_role: 'INSPECTOR' } }, {}, next);
  check({ user: { app_role: 'ADMIN' } }, {}, next);
  check({}, {}, next);

  assert.equal(results[0].status, 403);
  assert.equal(results[1], undefined);
  assert.equal(results[2].status, 401);
  assert.throws(() => requireRole('OWNER'));
});
