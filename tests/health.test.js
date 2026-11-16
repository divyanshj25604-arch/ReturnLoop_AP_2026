const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
});

test('GET /api/health returns 200 with service status', async () => {
  const res = await fetch(`${baseUrl}/api/health`);

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await res.json(), {
    success: true,
    message: 'Return Loop API is running',
    service: 'Return Loop',
    environment: process.env.NODE_ENV || 'development',
  });
});

test('unknown routes return 404 JSON', async () => {
  const res = await fetch(`${baseUrl}/api/does-not-exist`);

  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), {
    success: false,
    message: 'Route not found: GET /api/does-not-exist',
  });
});

test('malformed JSON bodies return 400', async () => {
  const res = await fetch(`${baseUrl}/api/health`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{bad json',
  });

  assert.equal(res.status, 400);
  assert.equal((await res.json()).success, false);
});
