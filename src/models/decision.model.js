// Queries for recommendations and decisions. Functions take a `client` (a
// pooled connection or a transaction client) so they can run in one transaction.

// What the engine needs: the product price and the return reason.
async function findEngineReturnInput(client, returnId) {
  const result = await client.query(
    `SELECT r.return_id, r.return_reason, p.product_id, p.retail_price
     FROM returns r
     JOIN products p ON r.product_id = p.product_id
     WHERE r.return_id = $1`,
    [returnId]
  );
  return result.rows[0] || null;
}

// The newest inspection is the one the engine uses (docs/api.md section 3).
async function findLatestInspection(client, returnId) {
  const result = await client.query(
    `SELECT inspection_id, condition_grade, functional_status, repair_estimate,
            has_original_packaging, has_all_accessories
     FROM inspections
     WHERE return_id = $1
     ORDER BY inspected_at DESC, inspection_id DESC
     LIMIT 1`,
    [returnId]
  );
  return result.rows[0] || null;
}

async function decisionExists(client, returnId) {
  const result = await client.query(
    'SELECT 1 FROM disposition_decisions WHERE return_id = $1',
    [returnId]
  );
  return result.rows.length > 0;
}

async function insertDecision(client, data) {
  const inserted = await client.query(
    `INSERT INTO disposition_decisions (
       return_id,
       recommended_disposition,
       final_disposition,
       decided_by_operator_id,
       is_override,
       override_reason,
       confidence_score
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING decision_id`,
    [
      data.return_id,
      data.recommended_disposition,
      data.final_disposition,
      data.decided_by_operator_id,
      data.is_override,
      data.override_reason,
      data.confidence_score,
    ]
  );

  const result = await client.query(
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
     WHERE d.decision_id = $1`,
    [inserted.rows[0].decision_id]
  );
  return result.rows[0];
}

// Saves all alternatives in one statement; returns them ordered by rank.
// net_expected_recovery is a generated column, so it is not inserted.
async function insertAlternatives(client, decisionId, alternatives) {
  const params = [];
  const rows = alternatives.map((alt) => {
    params.push(
      decisionId,
      alt.disposition_type,
      alt.estimated_revenue,
      alt.estimated_cost,
      alt.feasibility_score,
      alt.rank_order,
      alt.is_recommended,
      alt.rationale || null
    );
    const n = params.length;
    return `($${n - 7}, $${n - 6}, $${n - 5}, $${n - 4}, $${n - 3}, $${n - 2}, $${n - 1}, $${n})`;
  });

  const result = await client.query(
    `INSERT INTO decision_alternatives (
       decision_id,
       disposition_type,
       estimated_revenue,
       estimated_cost,
       feasibility_score,
       rank_order,
       is_recommended,
       rationale
     )
     VALUES ${rows.join(', ')}
     RETURNING alternative_id, disposition_type, estimated_revenue, estimated_cost,
               net_expected_recovery, feasibility_score, rank_order, is_recommended, rationale`,
    params
  );
  return result.rows.sort((a, b) => a.rank_order - b.rank_order);
}

module.exports = {
  findEngineReturnInput,
  findLatestInspection,
  decisionExists,
  insertDecision,
  insertAlternatives,
};
