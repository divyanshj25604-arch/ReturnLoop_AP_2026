const ApiError = require('./ApiError');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isMissing(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function todayIsoDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function isRealDate(value) {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

// Collects field errors for a request body, and the cleaned values that passed.
//
//   const v = createValidator(req.body);
//   v.string('return_reason', { required: true, max: 255 });
//   v.number('repair_estimate', { min: 0 });
//   v.oneOf('condition_grade', CONDITION_GRADES, { required: true });
//   v.throwIfErrors();          // throws ApiError 400 with { field, message } errors
//   const { return_reason } = v.values;
//
// Optional fields that are missing are left out of v.values.
function createValidator(body) {
  const source = body && typeof body === 'object' ? body : {};
  const errors = [];
  const values = {};

  function addError(field, message) {
    errors.push({ field, message });
  }

  // Returns true when the field should be checked further.
  function present(field, required) {
    if (isMissing(source[field])) {
      if (required) {
        addError(field, `${field} is required`);
      }
      return false;
    }
    return true;
  }

  const validator = {
    errors,
    values,

    string(field, { required = false, max } = {}) {
      if (!present(field, required)) return validator;
      const value = source[field];
      if (typeof value !== 'string') {
        addError(field, `${field} must be text`);
      } else if (max !== undefined && value.trim().length > max) {
        addError(field, `${field} must be at most ${max} characters`);
      } else {
        values[field] = value.trim();
      }
      return validator;
    },

    number(field, { required = false, min, max, integer = false } = {}) {
      if (!present(field, required)) return validator;
      const value = source[field];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        addError(field, `${field} must be a number`);
      } else if (integer && !Number.isInteger(value)) {
        addError(field, `${field} must be a whole number`);
      } else if (min !== undefined && value < min) {
        addError(field, `${field} must be at least ${min}`);
      } else if (max !== undefined && value > max) {
        addError(field, `${field} must be at most ${max}`);
      } else {
        values[field] = value;
      }
      return validator;
    },

    boolean(field, { required = false } = {}) {
      if (!present(field, required)) return validator;
      const value = source[field];
      if (typeof value !== 'boolean') {
        addError(field, `${field} must be true or false`);
      } else {
        values[field] = value;
      }
      return validator;
    },

    oneOf(field, allowed, { required = false } = {}) {
      if (!present(field, required)) return validator;
      const value = source[field];
      if (!allowed.includes(value)) {
        addError(field, `${field} must be one of: ${allowed.join(', ')}`);
      } else {
        values[field] = value;
      }
      return validator;
    },

    date(field, { required = false, notFuture = false } = {}) {
      if (!present(field, required)) return validator;
      const value = source[field];
      if (typeof value !== 'string' || !isRealDate(value)) {
        addError(field, `${field} must be a date in YYYY-MM-DD format`);
      } else if (notFuture && value > todayIsoDate()) {
        addError(field, `${field} cannot be in the future`);
      } else {
        values[field] = value;
      }
      return validator;
    },

    hasErrors() {
      return errors.length > 0;
    },

    throwIfErrors(message = 'Validation failed') {
      if (errors.length > 0) {
        throw ApiError.badRequest(message, errors);
      }
      return values;
    },
  };

  return validator;
}

module.exports = { createValidator, todayIsoDate };
