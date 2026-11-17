const db = require('../config/db');

async function findAll() {
  const result = await db.query(
    `SELECT product_id, sku, brand, model_name, category, retail_price, created_at
     FROM products
     ORDER BY product_id ASC`
  );
  return result.rows;
}

async function findById(id) {
  const result = await db.query(
    `SELECT product_id, sku, brand, model_name, category, retail_price, created_at
     FROM products
     WHERE product_id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  findAll,
  findById,
};
