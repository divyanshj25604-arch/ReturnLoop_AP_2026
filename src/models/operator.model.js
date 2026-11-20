const db = require('../config/db');
const buildUpdate = require('../utils/updateQuery');

// Columns an admin may change with PATCH /operators/:id (password handled
// separately as password_hash).
const UPDATABLE = ['full_name', 'role', 'app_role', 'warehouse_id', 'is_active', 'password_hash'];

// Public columns only. password_hash is never selected here, so it can't leak
// into an API response by accident.
const PUBLIC_COLUMNS = `
  operator_id, employee_code, full_name, email, role, app_role,
  warehouse_id, is_active, created_at
`;

async function findById(id) {
  const result = await db.query(
    `SELECT ${PUBLIC_COLUMNS} FROM operators WHERE operator_id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

// For login only: includes password_hash. Email match is case-insensitive.
async function findByEmailWithPassword(email) {
  const result = await db.query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash
     FROM operators
     WHERE lower(email) = lower($1)`,
    [email]
  );
  return result.rows[0] || null;
}

// For password changes only: includes password_hash.
async function findByIdWithPassword(id) {
  const result = await db.query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash FROM operators WHERE operator_id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function updatePasswordHash(id, passwordHash) {
  await db.query('UPDATE operators SET password_hash = $1 WHERE operator_id = $2', [
    passwordHash,
    id,
  ]);
}

// Optional filters: warehouse_id, app_role, is_active.
async function findAll({ warehouse_id, app_role, is_active } = {}) {
  const params = [];
  const conditions = [];

  if (warehouse_id !== undefined) {
    params.push(warehouse_id);
    conditions.push(`warehouse_id = $${params.length}`);
  }
  if (app_role !== undefined) {
    params.push(app_role);
    conditions.push(`app_role = $${params.length}`);
  }
  if (is_active !== undefined) {
    params.push(is_active);
    conditions.push(`is_active = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(
    `SELECT ${PUBLIC_COLUMNS} FROM operators ${where} ORDER BY operator_id ASC`,
    params
  );
  return result.rows;
}

async function create(data) {
  const result = await db.query(
    `INSERT INTO operators
       (employee_code, full_name, email, role, app_role, warehouse_id, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${PUBLIC_COLUMNS}`,
    [
      data.employee_code,
      data.full_name,
      data.email,
      data.role,
      data.app_role,
      data.warehouse_id,
      data.password_hash,
    ]
  );
  return result.rows[0];
}

// Returns the updated operator (without password_hash), or null if missing.
async function update(id, values) {
  const update = buildUpdate(values, UPDATABLE);
  if (!update) {
    return findById(id);
  }
  const result = await db.query(
    `UPDATE operators SET ${update.setClause}
     WHERE operator_id = $${update.params.length + 1}
     RETURNING ${PUBLIC_COLUMNS}`,
    [...update.params, id]
  );
  return result.rows[0] || null;
}

module.exports = {
  findAll,
  create,
  update,
  findById,
  findByEmailWithPassword,
  findByIdWithPassword,
  updatePasswordHash,
};
