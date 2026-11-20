// Dashboard endpoint (docs/api.md section 5.7).
// Needs a database set up with `npm run db:setup` and JWT_SECRET in .env.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/config/db');
const { RETURN_STATUSES, DISPOSITIONS } = require('../src/utils/constants');

const PASSWORD = 'Devanshi1234';

let server;
let baseUrl;
let supervisor;
let admin;
let inspector;

async function api(path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${baseUrl}/api${path}`, { headers });
  return { status: res.status, body: await res.json() };
}

async function login(email) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  return (await res.json()).data.token;
}

async function scalar(sql, params = []) {
  const result = await db.query(sql, params);
  return Object.values(result.rows[0])[0];
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  supervisor = await login('priya.sundaram@returnloop.internal');
  admin = await login('rajesh.sharma@returnloop.internal');
  inspector = await login('amit.kulkarni@returnloop.internal');
});

after(async () => {
  server.close();
  await db.end();
});

test('dashboard has every documented field, all statuses and dispositions', async () => {
  const res = await api('/dashboard', supervisor);
  assert.equal(res.status, 200);

  const data = res.body.data;
  assert.deepEqual(Object.keys(data).sort(), [
    'decisions_by_disposition',
    'override_rate',
    'recent_returns',
    'returns_by_status',
    'total_actual_recovery',
    'total_expected_recovery',
  ]);
  assert.deepEqual(Object.keys(data.returns_by_status), RETURN_STATUSES);
  assert.deepEqual(Object.keys(data.decisions_by_disposition), DISPOSITIONS);
  for (const key of ['override_rate', 'total_expected_recovery', 'total_actual_recovery']) {
    assert.equal(typeof data[key], 'number', key);
  }
  assert.ok(data.override_rate >= 0 && data.override_rate <= 1);
});

test('dashboard numbers match the database', async () => {
  const { data } = (await api('/dashboard', supervisor)).body;

  const totalReturns = Object.values(data.returns_by_status).reduce((a, b) => a + b, 0);
  assert.equal(totalReturns, await scalar('SELECT count(*)::int FROM returns'));

  const totalDecisions = Object.values(data.decisions_by_disposition).reduce((a, b) => a + b, 0);
  assert.equal(totalDecisions, await scalar('SELECT count(*)::int FROM disposition_decisions'));

  const overrides = await scalar(
    'SELECT count(*)::int FROM disposition_decisions WHERE is_override'
  );
  assert.equal(
    data.override_rate,
    totalDecisions === 0 ? 0 : Math.round((overrides / totalDecisions) * 1000) / 1000
  );

  assert.equal(
    data.total_actual_recovery,
    await scalar('SELECT coalesce(sum(actual_net_recovery), 0) FROM decision_outcomes')
  );
  assert.equal(
    data.total_expected_recovery,
    await scalar(
      `SELECT coalesce(sum(a.net_expected_recovery), 0)
       FROM disposition_decisions d
       JOIN decision_alternatives a
         ON a.decision_id = d.decision_id AND a.disposition_type = d.final_disposition`
    )
  );
});

test('recent_returns lists the 5 newest returns in the list-item shape', async () => {
  const { data } = (await api('/dashboard', supervisor)).body;
  assert.equal(data.recent_returns.length, 5);

  const times = data.recent_returns.map((r) => new Date(r.created_at).getTime());
  assert.deepEqual(times, [...times].sort((a, b) => b - a));
  for (const field of ['return_tracking_number', 'brand', 'model_name', 'warehouse_code', 'status']) {
    assert.ok(field in data.recent_returns[0], field);
  }
});

test('warehouse_id narrows every figure to that warehouse', async () => {
  const all = (await api('/dashboard', supervisor)).body.data;
  const wh1 = (await api('/dashboard?warehouse_id=1', supervisor)).body.data;

  const wh1Returns = Object.values(wh1.returns_by_status).reduce((a, b) => a + b, 0);
  assert.equal(
    wh1Returns,
    await scalar('SELECT count(*)::int FROM returns WHERE warehouse_id = 1')
  );
  assert.ok(wh1Returns < Object.values(all.returns_by_status).reduce((a, b) => a + b, 0));
  assert.ok(wh1.recent_returns.every((r) => r.warehouse_id === 1));
  assert.equal(
    wh1.total_actual_recovery,
    await scalar(
      `SELECT coalesce(sum(o.actual_net_recovery), 0)
       FROM decision_outcomes o
       JOIN disposition_decisions d ON d.decision_id = o.decision_id
       JOIN returns r ON r.return_id = d.return_id
       WHERE r.warehouse_id = 1`
    )
  );
});

test('a warehouse with no returns shows zeros, not missing keys', async () => {
  const empty = await scalar(
    `SELECT coalesce(max(warehouse_id), 0) + 1000 FROM warehouses`
  );
  const { data } = (await api(`/dashboard?warehouse_id=${empty}`, admin)).body;
  assert.ok(Object.values(data.returns_by_status).every((n) => n === 0));
  assert.ok(Object.values(data.decisions_by_disposition).every((n) => n === 0));
  assert.equal(data.override_rate, 0);
  assert.equal(data.total_expected_recovery, 0);
  assert.equal(data.total_actual_recovery, 0);
  assert.deepEqual(data.recent_returns, []);
});

test('inspectors get 403, no token gets 401, bad warehouse_id gets 400', async () => {
  assert.equal((await api('/dashboard', inspector)).status, 403);
  assert.equal((await api('/dashboard')).status, 401);
  const bad = await api('/dashboard?warehouse_id=abc', supervisor);
  assert.equal(bad.status, 400);
  assert.equal(bad.body.errors[0].field, 'warehouse_id');
});
