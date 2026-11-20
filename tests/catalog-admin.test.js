// Warehouse and product endpoints (docs/api.md sections 5.3 and 5.4).
// Needs a database set up with `npm run db:setup` and JWT_SECRET in .env.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const app = require('../src/app');
const db = require('../src/config/db');

const PASSWORD = 'Devanshi1234';
const PREFIX = 'TEST-CAT-';

let server;
let baseUrl;
let admin;
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
  return res.body.data.token;
}

const newWarehouse = (suffix) => ({
  warehouse_code: `${PREFIX}${suffix}`,
  facility_name: 'Test Hub',
  city: 'Pune',
  state: 'Maharashtra',
  capacity: 100,
});

const newProduct = (suffix) => ({
  sku: `${PREFIX}${suffix}`,
  brand: 'TestBrand',
  model_name: 'Model X',
  category: 'Test Category',
  retail_price: 1999.5,
});

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  admin = await login('rajesh.sharma@returnloop.internal');
  supervisor = await login('priya.sundaram@returnloop.internal');
  inspector = await login('amit.kulkarni@returnloop.internal');
});

after(async () => {
  await db.query('DELETE FROM products WHERE sku LIKE $1', [`${PREFIX}%`]);
  await db.query('DELETE FROM warehouses WHERE warehouse_code LIKE $1', [`${PREFIX}%`]);
  server.close();
  await db.end();
});

// ---------- Warehouses ----------

test('any logged-in user can list warehouses', async () => {
  const res = await api('GET', '/warehouses', { token: inspector });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.length >= 4);
  assert.deepEqual(Object.keys(res.body.data[0]).sort(), [
    'capacity',
    'city',
    'created_at',
    'facility_name',
    'state',
    'warehouse_code',
    'warehouse_id',
  ]);
});

test('listing warehouses needs a token', async () => {
  assert.equal((await api('GET', '/warehouses')).status, 401);
});

test('admin creates and updates a warehouse', async () => {
  const created = await api('POST', '/warehouses', { token: admin, body: newWarehouse('W1') });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.warehouse_code, `${PREFIX}W1`);

  const id = created.body.data.warehouse_id;
  const updated = await api('PATCH', `/warehouses/${id}`, {
    token: admin,
    body: { capacity: 250, city: 'Nagpur' },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.capacity, 250);
  assert.equal(updated.body.data.city, 'Nagpur');
  assert.equal(updated.body.data.facility_name, 'Test Hub');
});

test('only admins can create or update warehouses', async () => {
  for (const token of [supervisor, inspector]) {
    assert.equal(
      (await api('POST', '/warehouses', { token, body: newWarehouse('NOPE') })).status,
      403
    );
    assert.equal((await api('PATCH', '/warehouses/1', { token, body: { capacity: 5 } })).status, 403);
  }
});

test('warehouse validation and duplicates', async () => {
  const missing = await api('POST', '/warehouses', { token: admin, body: { city: 'Pune' } });
  assert.equal(missing.status, 400);
  const fields = missing.body.errors.map((e) => e.field);
  for (const field of ['warehouse_code', 'facility_name', 'state', 'capacity']) {
    assert.ok(fields.includes(field), field);
  }

  const zeroCapacity = await api('POST', '/warehouses', {
    token: admin,
    body: { ...newWarehouse('W2'), capacity: 0 },
  });
  assert.equal(zeroCapacity.status, 400);

  const duplicate = await api('POST', '/warehouses', {
    token: admin,
    body: { ...newWarehouse('W3'), warehouse_code: 'WH-DEL-01' },
  });
  assert.equal(duplicate.status, 409);
});

test('updating a missing warehouse gives 404, a bad id gives 400', async () => {
  assert.equal(
    (await api('PATCH', '/warehouses/999999', { token: admin, body: { capacity: 5 } })).status,
    404
  );
  assert.equal(
    (await api('PATCH', '/warehouses/abc', { token: admin, body: { capacity: 5 } })).status,
    400
  );
});

// ---------- Products ----------

test('products can be filtered by category and searched', async () => {
  const all = await api('GET', '/products', { token: inspector });
  const category = all.body.data[0].category;

  const byCategory = await api('GET', `/products?category=${encodeURIComponent(category)}`, {
    token: inspector,
  });
  assert.ok(byCategory.body.data.length > 0);
  for (const product of byCategory.body.data) {
    assert.equal(product.category, category);
  }

  const bySearch = await api('GET', '/products?q=sams', { token: inspector });
  assert.ok(bySearch.body.data.length > 0);
  for (const product of bySearch.body.data) {
    const text = `${product.sku} ${product.brand} ${product.model_name}`.toLowerCase();
    assert.ok(text.includes('sams'));
  }
});

test('admin creates and updates a product; prices are numbers', async () => {
  const created = await api('POST', '/products', { token: admin, body: newProduct('P1') });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.retail_price, 1999.5);

  const id = created.body.data.product_id;
  const updated = await api('PATCH', `/products/${id}`, {
    token: admin,
    body: { retail_price: 1499 },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.retail_price, 1499);
  assert.equal(updated.body.data.brand, 'TestBrand');
});

test('only admins can create or update products', async () => {
  for (const token of [supervisor, inspector]) {
    assert.equal((await api('POST', '/products', { token, body: newProduct('NOPE') })).status, 403);
    assert.equal(
      (await api('PATCH', '/products/1', { token, body: { retail_price: 1 } })).status,
      403
    );
  }
});

test('product validation and duplicate SKU', async () => {
  const negative = await api('POST', '/products', {
    token: admin,
    body: { ...newProduct('P2'), retail_price: -1 },
  });
  assert.equal(negative.status, 400);
  assert.equal(negative.body.errors[0].field, 'retail_price');

  const duplicate = await api('POST', '/products', {
    token: admin,
    body: { ...newProduct('P3'), sku: 'SKU-APPL-IPH14-128' },
  });
  assert.equal(duplicate.status, 409);

  const badType = await api('PATCH', '/products/1', {
    token: admin,
    body: { retail_price: 'free' },
  });
  assert.equal(badType.status, 400);
});
