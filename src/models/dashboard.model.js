// Dashboard figures (docs/api.md section 5.7), based on the queries in
// dbms/07_dashboard_queries.sql. Every query takes the same optional
// warehouse filter as $1: NULL means all warehouses.

const db = require('../config/db');
const { RETURN_STATUSES, DISPOSITIONS } = require('../utils/constants');

const WAREHOUSE_FILTER = '($1::int IS NULL OR r.warehouse_id = $1::int)';

async function returnsByStatus(warehouseId) {
  const result = await db.query(
    `SELECT r.status, count(*)::int AS count
     FROM returns r
     WHERE ${WAREHOUSE_FILTER}
     GROUP BY r.status`,
    [warehouseId]
  );
  // Every status is always present, with 0 when there are none.
  const counts = Object.fromEntries(RETURN_STATUSES.map((status) => [status, 0]));
  for (const row of result.rows) counts[row.status] = row.count;
  return counts;
}

async function decisionsByDisposition(warehouseId) {
  const result = await db.query(
    `SELECT d.final_disposition AS disposition, count(*)::int AS count
     FROM disposition_decisions d
     JOIN returns r ON r.return_id = d.return_id
     WHERE ${WAREHOUSE_FILTER}
     GROUP BY d.final_disposition`,
    [warehouseId]
  );
  const counts = Object.fromEntries(DISPOSITIONS.map((disposition) => [disposition, 0]));
  for (const row of result.rows) counts[row.disposition] = row.count;
  return counts;
}

// Override rate (overrides / decisions, 0 when none) and both recovery totals.
async function totals(warehouseId) {
  const result = await db.query(
    `SELECT
       (SELECT round(
                 coalesce(count(*) FILTER (WHERE d.is_override)::numeric / nullif(count(*), 0), 0),
                 3)
        FROM disposition_decisions d
        JOIN returns r ON r.return_id = d.return_id
        WHERE ${WAREHOUSE_FILTER}) AS override_rate,

       -- Expected recovery of the alternative that matches the final disposition.
       (SELECT coalesce(sum(a.net_expected_recovery), 0)
        FROM disposition_decisions d
        JOIN returns r ON r.return_id = d.return_id
        JOIN decision_alternatives a
          ON a.decision_id = d.decision_id AND a.disposition_type = d.final_disposition
        WHERE ${WAREHOUSE_FILTER}) AS total_expected_recovery,

       (SELECT coalesce(sum(o.actual_net_recovery), 0)
        FROM decision_outcomes o
        JOIN disposition_decisions d ON d.decision_id = o.decision_id
        JOIN returns r ON r.return_id = d.return_id
        WHERE ${WAREHOUSE_FILTER}) AS total_actual_recovery`,
    [warehouseId]
  );
  return result.rows[0];
}

async function recentReturns(warehouseId, limit = 5) {
  const result = await db.query(
    `SELECT
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
       to_char(r.return_date, 'YYYY-MM-DD') AS return_date,
       r.status,
       r.customer_comment,
       r.created_at
     FROM returns r
     JOIN products p ON r.product_id = p.product_id
     JOIN warehouses w ON r.warehouse_id = w.warehouse_id
     WHERE ${WAREHOUSE_FILTER}
     ORDER BY r.created_at DESC, r.return_id DESC
     LIMIT $2`,
    [warehouseId, limit]
  );
  return result.rows;
}

async function getDashboard(warehouseId = null) {
  const [byStatus, byDisposition, sums, recent] = await Promise.all([
    returnsByStatus(warehouseId),
    decisionsByDisposition(warehouseId),
    totals(warehouseId),
    recentReturns(warehouseId),
  ]);

  return {
    returns_by_status: byStatus,
    decisions_by_disposition: byDisposition,
    override_rate: sums.override_rate,
    total_expected_recovery: sums.total_expected_recovery,
    total_actual_recovery: sums.total_actual_recovery,
    recent_returns: recent,
  };
}

module.exports = { getDashboard };
