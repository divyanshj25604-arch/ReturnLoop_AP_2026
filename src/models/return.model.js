const db = require('../config/db');

// Columns for one return in lists and the detail "return" section
// (docs/api.md section 5.6, GET /returns item shape).
const RETURN_SELECT = `
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
    to_char(r.return_date, 'YYYY-MM-DD') AS return_date,
    r.status,
    r.customer_comment,
    r.created_at
  FROM returns r
  JOIN products p ON r.product_id = p.product_id
  JOIN warehouses w ON r.warehouse_id = w.warehouse_id
`;

function buildFilters({ status, warehouse_id, q }) {
  const params = [];
  const conditions = [];

  if (status) {
    params.push(status);
    conditions.push(`r.status = $${params.length}`);
  }
  if (warehouse_id) {
    params.push(warehouse_id);
    conditions.push(`r.warehouse_id = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    conditions.push(
      `(r.return_tracking_number ILIKE $${params.length} OR r.serial_number ILIKE $${params.length})`
    );
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

// Returns { rows, total } for one page, newest first.
async function findPage({ status, warehouse_id, q, page = 1, limit = 20 } = {}) {
  const { where, params } = buildFilters({ status, warehouse_id, q });

  const countResult = await db.query(`SELECT count(*)::int AS total FROM returns r ${where}`, params);

  const pageParams = [...params, limit, (page - 1) * limit];
  const rowsResult = await db.query(
    `${RETURN_SELECT}
     ${where}
     ORDER BY r.created_at DESC, r.return_id DESC
     LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
    pageParams
  );

  return { rows: rowsResult.rows, total: countResult.rows[0].total };
}

async function findById(id) {
  const result = await db.query(`${RETURN_SELECT} WHERE r.return_id = $1`, [id]);
  return result.rows[0] || null;
}

// Inspections for a return, newest first. The first one is what the engine uses.
async function findInspections(returnId) {
  const result = await db.query(
    `SELECT
       i.inspection_id,
       i.inspector_id,
       o.full_name AS inspector_name,
       i.condition_grade,
       i.has_original_packaging,
       i.has_all_accessories,
       i.functional_status,
       i.repair_estimate,
       i.diagnostic_notes,
       i.inspected_at
     FROM inspections i
     JOIN operators o ON i.inspector_id = o.operator_id
     WHERE i.return_id = $1
     ORDER BY i.inspected_at DESC, i.inspection_id DESC`,
    [returnId]
  );
  return result.rows;
}

async function findDecision(returnId) {
  const result = await db.query(
    `SELECT
       d.decision_id,
       d.return_id,
       d.recommended_disposition,
       d.final_disposition,
       d.is_override,
       d.override_reason,
       d.confidence_score,
       d.decided_by_operator_id,
       o.full_name AS decided_by_name,
       d.decided_at
     FROM disposition_decisions d
     JOIN operators o ON d.decided_by_operator_id = o.operator_id
     WHERE d.return_id = $1`,
    [returnId]
  );
  return result.rows[0] || null;
}

async function findAlternatives(decisionId) {
  const result = await db.query(
    `SELECT
       alternative_id,
       disposition_type,
       estimated_revenue,
       estimated_cost,
       net_expected_recovery,
       feasibility_score,
       rank_order,
       is_recommended,
       rationale
     FROM decision_alternatives
     WHERE decision_id = $1
     ORDER BY rank_order ASC`,
    [decisionId]
  );
  return result.rows;
}

async function findOutcome(decisionId) {
  const result = await db.query(
    `SELECT
       outcome_id,
       decision_id,
       disposition_executed,
       actual_revenue,
       actual_cost,
       actual_net_recovery,
       execution_partner,
       to_char(completion_date, 'YYYY-MM-DD') AS completion_date,
       outcome_notes,
       created_at
     FROM decision_outcomes
     WHERE decision_id = $1`,
    [decisionId]
  );
  return result.rows[0] || null;
}

// Everything the return detail page needs (docs/api.md GET /returns/:id).
async function findDetail(returnItem) {
  const inspections = await findInspections(returnItem.return_id);
  const decision = await findDecision(returnItem.return_id);
  const alternatives = decision ? await findAlternatives(decision.decision_id) : [];
  const outcome = decision ? await findOutcome(decision.decision_id) : null;

  return { return: returnItem, inspections, decision, alternatives, outcome };
}

async function findProductIdBySku(sku) {
  const result = await db.query('SELECT product_id FROM products WHERE sku = $1', [sku]);
  return result.rows[0] ? result.rows[0].product_id : null;
}

async function findWarehouseIdByCode(code) {
  const result = await db.query('SELECT warehouse_id FROM warehouses WHERE warehouse_code = $1', [
    code,
  ]);
  return result.rows[0] ? result.rows[0].warehouse_id : null;
}

// New returns always start as RECEIVED (status is not accepted from clients).
async function create(data) {
  const result = await db.query(
    `INSERT INTO returns (
       return_tracking_number,
       product_id,
       warehouse_id,
       serial_number,
       return_reason,
       return_date,
       customer_comment
     )
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7)
     RETURNING return_id`,
    [
      data.return_tracking_number,
      data.product_id,
      data.warehouse_id,
      data.serial_number || null,
      data.return_reason,
      data.return_date || null,
      data.customer_comment || null,
    ]
  );
  return findById(result.rows[0].return_id);
}

module.exports = {
  findPage,
  findById,
  findDetail,
  findInspections,
  findDecision,
  findAlternatives,
  findOutcome,
  findProductIdBySku,
  findWarehouseIdByCode,
  create,
};
