const db = require('../config/db');
const buildUpdate = require('../utils/updateQuery');

const COLUMNS = `product_id, sku, brand, model_name, category, retail_price, created_at`;
const UPDATABLE = ['sku', 'brand', 'model_name', 'category', 'retail_price'];

// Optional filters: category (exact match) and q (search in SKU, brand and
// model name, case-insensitive).
async function findAll({ category, q } = {}) {
  const params = [];
  const conditions = [];

  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    conditions.push(
      `(sku ILIKE $${params.length} OR brand ILIKE $${params.length} OR model_name ILIKE $${params.length})`
    );
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(
    `SELECT ${COLUMNS} FROM products ${where} ORDER BY product_id ASC`,
    params
  );
  return result.rows;
}

async function findById(id) {
  const result = await db.query(`SELECT ${COLUMNS} FROM products WHERE product_id = $1`, [id]);
  return result.rows[0] || null;
}

async function create(data) {
  const result = await db.query(
    `INSERT INTO products (sku, brand, model_name, category, retail_price)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [data.sku, data.brand, data.model_name, data.category, data.retail_price]
  );
  return result.rows[0];
}

// Returns the updated product, or null if it doesn't exist.
async function update(id, values) {
  const update = buildUpdate(values, UPDATABLE);
  if (!update) {
    return findById(id);
  }
  const result = await db.query(
    `UPDATE products SET ${update.setClause}
     WHERE product_id = $${update.params.length + 1}
     RETURNING ${COLUMNS}`,
    [...update.params, id]
  );
  return result.rows[0] || null;
}

module.exports = { findAll, findById, create, update };
