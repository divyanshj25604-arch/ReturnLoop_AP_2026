const { test } = require('node:test');
const assert = require('node:assert/strict');
const { types } = require('pg');

const ApiError = require('../src/utils/ApiError');
const parseId = require('../src/utils/parseId');
const { createValidator } = require('../src/utils/validator');
const { CONDITION_GRADES } = require('../src/utils/constants');
const errorHandler = require('../src/middleware/errorHandler');
require('../src/config/db');

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('parseId accepts positive integers only', () => {
  assert.equal(parseId('12'), 12);
  assert.equal(parseId(' 7 '), 7);
  assert.equal(parseId(5), 5);
  for (const bad of ['0', '-3', '1.5', '12abc', '', 'abc', undefined, null, 0, 2.5]) {
    assert.equal(parseId(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});

test('validator collects errors and cleaned values', () => {
  const v = createValidator({
    return_reason: '  Screen flickering ',
    repair_estimate: -5,
    condition_grade: 'Mint',
    has_original_packaging: 'yes',
    return_date: '2026-02-30',
  });
  v.string('return_reason', { required: true });
  v.string('customer_comment');
  v.number('repair_estimate', { min: 0 });
  v.oneOf('condition_grade', CONDITION_GRADES, { required: true });
  v.boolean('has_original_packaging');
  v.date('return_date');
  v.string('serial_number', { required: true });

  assert.equal(v.values.return_reason, 'Screen flickering');
  assert.equal('customer_comment' in v.values, false);
  assert.deepEqual(
    v.errors.map((e) => e.field),
    ['repair_estimate', 'condition_grade', 'has_original_packaging', 'return_date', 'serial_number']
  );
});

test('validator rejects future dates when notFuture is set', () => {
  const v = createValidator({ return_date: '2999-01-01' });
  v.date('return_date', { notFuture: true });
  assert.equal(v.errors[0].message, 'return_date cannot be in the future');
});

test('throwIfErrors throws a 400 ApiError with field errors', () => {
  const v = createValidator({});
  v.string('return_reason', { required: true });
  assert.throws(
    () => v.throwIfErrors(),
    (err) =>
      err instanceof ApiError &&
      err.status === 400 &&
      err.errors[0].field === 'return_reason'
  );
  assert.deepEqual(createValidator({ a: 'x' }).string('a').throwIfErrors(), { a: 'x' });
});

test('errorHandler includes field errors for client errors', () => {
  const res = fakeRes();
  errorHandler(ApiError.badRequest('Validation failed', [{ field: 'x', message: 'x is required' }]), {}, res, () => {});
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    success: false,
    message: 'Validation failed',
    errors: [{ field: 'x', message: 'x is required' }],
  });
});

test('errorHandler leaves out errors when there are none', () => {
  const res = fakeRes();
  errorHandler(ApiError.conflict('Already decided'), {}, res, () => {});
  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body, { success: false, message: 'Already decided' });
});

test('NUMERIC columns are parsed as numbers', () => {
  const parse = types.getTypeParser(1700, 'text');
  assert.equal(parse('1249.99'), 1249.99);
  assert.equal(parse('0.825'), 0.825);
});
