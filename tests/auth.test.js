// Needs a database set up with `npm run db:setup` and JWT_SECRET in .env.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/config/db');

const PASSWORD = 'Devanshi1234';
const ADMIN_EMAIL = 'rajesh.sharma@returnloop.internal';
const INSPECTOR_EMAIL = 'amit.kulkarni@returnloop.internal';

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await db.end();
});

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

test('login with a seeded account returns a token and the user', async () => {
  const res = await login(ADMIN_EMAIL);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(typeof res.body.data.token, 'string');
  assert.deepEqual(Object.keys(res.body.data.user).sort(), [
    'app_role',
    'email',
    'employee_code',
    'full_name',
    'operator_id',
    'warehouse_id',
  ]);
  assert.equal(res.body.data.user.app_role, 'ADMIN');
});

test('login email is case-insensitive', async () => {
  const res = await login(ADMIN_EMAIL.toUpperCase());
  assert.equal(res.status, 200);
});

test('wrong password and unknown email give the same 401', async () => {
  const wrongPassword = await login(ADMIN_EMAIL, 'wrong-password');
  const unknownEmail = await login('nobody@returnloop.internal');

  for (const res of [wrongPassword, unknownEmail]) {
    assert.equal(res.status, 401);
    assert.deepEqual(res.body, { success: false, message: 'Invalid email or password' });
  }
});

test('inactive operators cannot log in', async () => {
  await db.query('UPDATE operators SET is_active = FALSE WHERE email = $1', [INSPECTOR_EMAIL]);
  try {
    const res = await login(INSPECTOR_EMAIL);
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Invalid email or password');
  } finally {
    await db.query('UPDATE operators SET is_active = TRUE WHERE email = $1', [INSPECTOR_EMAIL]);
  }
});

test('login without email or password returns 400 with field errors', async () => {
  const res = await api('POST', '/auth/login', { body: {} });
  assert.equal(res.status, 400);
  assert.deepEqual(
    res.body.errors.map((e) => e.field),
    ['email', 'password']
  );
});

test('GET /auth/me returns the logged-in user', async () => {
  const { body } = await login(INSPECTOR_EMAIL);
  const res = await api('GET', '/auth/me', { token: body.data.token });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, body.data.user);
});

test('GET /auth/me rejects missing and invalid tokens', async () => {
  assert.equal((await api('GET', '/auth/me')).status, 401);
  assert.equal((await api('GET', '/auth/me', { token: 'not-a-token' })).status, 401);
});

test('no auth response ever contains password_hash', async () => {
  const { body } = await login(ADMIN_EMAIL);
  const me = await api('GET', '/auth/me', { token: body.data.token });
  assert.equal(JSON.stringify(body).includes('password_hash'), false);
  assert.equal(JSON.stringify(me.body).includes('password_hash'), false);
});

test('PATCH /auth/password changes the password', async () => {
  const { body } = await login(INSPECTOR_EMAIL);
  const token = body.data.token;
  const newPassword = 'a-new-password-123';

  try {
    const res = await api('PATCH', '/auth/password', {
      token,
      body: { current_password: PASSWORD, new_password: newPassword },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { success: true, message: 'Password updated' });

    assert.equal((await login(INSPECTOR_EMAIL)).status, 401);
    assert.equal((await login(INSPECTOR_EMAIL, newPassword)).status, 200);
  } finally {
    // Put the seed password back so other tests and teammates can still log in.
    await api('PATCH', '/auth/password', {
      token,
      body: { current_password: newPassword, new_password: PASSWORD },
    });
  }
  assert.equal((await login(INSPECTOR_EMAIL)).status, 200);
});

test('PATCH /auth/password validates input', async () => {
  const { body } = await login(INSPECTOR_EMAIL);
  const token = body.data.token;

  const tooShort = await api('PATCH', '/auth/password', {
    token,
    body: { current_password: PASSWORD, new_password: 'short' },
  });
  assert.equal(tooShort.status, 400);
  assert.equal(tooShort.body.errors[0].field, 'new_password');

  const wrongCurrent = await api('PATCH', '/auth/password', {
    token,
    body: { current_password: 'wrong-password', new_password: 'long-enough-password' },
  });
  assert.equal(wrongCurrent.status, 401);

  const noToken = await api('PATCH', '/auth/password', {
    body: { current_password: PASSWORD, new_password: 'long-enough-password' },
  });
  assert.equal(noToken.status, 401);
});
