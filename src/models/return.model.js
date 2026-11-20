const db = require('../config/db');

async function findAll(filters = {}) {
  let queryText = `
    SELECT
      r.return_id,
      r.return_tracking_number,
      r.product_id,
      p.sku,
      p.brand,
      p.model_name,
      p.category,
      p.retail_price,
      r.warehouse_id,
      w.warehouse_code,
      w.facility_name,
      r.serial_number,
      r.return_reason,
      r.return_date,
      r.status,
      r.customer_comment,
      r.created_at
    FROM returns r
    LEFT JOIN products p ON r.product_id = p.product_id
    LEFT JOIN warehouses w ON r.warehouse_id = w.warehouse_id
  `;
  const params = [];
  const conditions = [];

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`r.status = $${params.length}`);
  }

  if (filters.warehouse_id) {
    params.push(filters.warehouse_id);
    conditions.push(`r.warehouse_id = $${params.length}`);
  }

  if (conditions.length > 0) {
    queryText += ` WHERE ${conditions.join(' AND ')}`;
  }

  queryText += ' ORDER BY r.return_id ASC';

  const result = await db.query(queryText, params);
  return result.rows;
}

async function findById(id) {
  const queryText = `
    SELECT
      r.return_id,
      r.return_tracking_number,
      r.product_id,
      p.sku,
      p.brand,
      p.model_name,
      p.category,
      p.retail_price,
      r.warehouse_id,
      w.warehouse_code,
      w.facility_name,
      r.serial_number,
      r.return_reason,
      r.return_date,
      r.status,
      r.customer_comment,
      r.created_at
    FROM returns r
    LEFT JOIN products p ON r.product_id = p.product_id
    LEFT JOIN warehouses w ON r.warehouse_id = w.warehouse_id
    WHERE r.return_id = $1
  `;
  const result = await db.query(queryText, [id]);
  return result.rows[0] || null;
}

async function create(data) {
  const {
    return_tracking_number,
    product_id,
    warehouse_id,
    serial_number,
    return_reason,
    return_date,
    status,
    customer_comment,
  } = data;

  const queryText = `
    INSERT INTO returns (
      return_tracking_number,
      product_id,
      warehouse_id,
      serial_number,
      return_reason,
      return_date,
      status,
      customer_comment
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      COALESCE($6, CURRENT_DATE),
      COALESCE($7, 'RECEIVED'),
      $8
    )
    RETURNING *
  `;

  const values = [
    return_tracking_number,
    product_id,
    warehouse_id,
    serial_number || null,
    return_reason,
    return_date || null,
    status || null,
    customer_comment || null,
  ];

  const result = await db.query(queryText, values);
  return result.rows[0];
}

module.exports = {
  findAll,
  findById,
  create,
};
