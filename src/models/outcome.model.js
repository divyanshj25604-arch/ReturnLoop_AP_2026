// Queries for the last workflow stages: recording an outcome and cancelling.
// Functions take a `client` so they can run inside one transaction.

// The decision for a return (final_disposition is the default for the outcome).
async function findDecisionForReturn(client, returnId) {
  const result = await client.query(
    'SELECT decision_id, final_disposition FROM disposition_decisions WHERE return_id = $1',
    [returnId]
  );
  return result.rows[0] || null;
}

async function outcomeExists(client, decisionId) {
  const result = await client.query('SELECT 1 FROM decision_outcomes WHERE decision_id = $1', [
    decisionId,
  ]);
  return result.rows.length > 0;
}

// Inserts the outcome; actual_net_recovery is a generated column.
async function insertOutcome(client, data) {
  const result = await client.query(
    `INSERT INTO decision_outcomes (
       decision_id,
       disposition_executed,
       actual_revenue,
       actual_cost,
       execution_partner,
       completion_date,
       outcome_notes
     )
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7)
     RETURNING
       outcome_id,
       decision_id,
       disposition_executed,
       actual_revenue,
       actual_cost,
       actual_net_recovery,
       execution_partner,
       to_char(completion_date, 'YYYY-MM-DD') AS completion_date,
       outcome_notes,
       created_at`,
    [
      data.decision_id,
      data.disposition_executed,
      data.actual_revenue,
      data.actual_cost,
      data.execution_partner || null,
      data.completion_date || null,
      data.outcome_notes || null,
    ]
  );
  return result.rows[0];
}

// Marks a return CANCELLED and appends "[Cancelled] <reason>" to its comment
// (docs/api.md 5.6.6; no schema change needed).
async function cancelReturn(client, returnId, reason) {
  await client.query(
    `UPDATE returns
     SET status = 'CANCELLED',
         customer_comment = CASE
           WHEN customer_comment IS NULL OR btrim(customer_comment) = ''
             THEN '[Cancelled] ' || $2
           ELSE customer_comment || E'\\n' || '[Cancelled] ' || $2
         END
     WHERE return_id = $1`,
    [returnId, reason]
  );
}

module.exports = { findDecisionForReturn, outcomeExists, insertOutcome, cancelReturn };
