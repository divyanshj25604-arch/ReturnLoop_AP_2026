const db = require('../config/db');
const buildUpdate = require('../utils/updateQuery');

const COLUMNS = `warehouse_id, warehouse_code, facility_name, city, state, capacity, created_at`;
const UPDATABLE = ['warehouse_code', 'facility_name', 'city', 'state', 'capacity'];

async function findAll() {
  const result = await db.query(`SELECT ${COLUMNS} FROM warehouses ORDER BY warehouse_id ASC`);
  return result.rows;
}

async function findById(id) {
  const result = await db.query(`SELECT ${COLUMNS} FROM warehouses WHERE warehouse_id = $1`, [id]);
  return result.rows[0] || null;
}

async function create(data) {
  const result = await db.query(
    `INSERT INTO warehouses (warehouse_code, facility_name, city, state, capacity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [data.warehouse_code, data.facility_name, data.city, data.state, data.capacity]
  );
  return result.rows[0];
}

// Returns the updated warehouse, or null if it doesn't exist.
async function update(id, values) {
  const update = buildUpdate(values, UPDATABLE);
  if (!update) {
    return findById(id);
  }
  const result = await db.query(
    `UPDATE warehouses SET ${update.setClause}
     WHERE warehouse_id = $${update.params.length + 1}
     RETURNING ${COLUMNS}`,
    [...update.params, id]
  );
  return result.rows[0] || null;
}

module.exports = { findAll, findById, create, update };
