const db = require('../config/db');

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

module.exports = {
  findById,
  findByEmailWithPassword,
  findByIdWithPassword,
  updatePasswordHash,
};
