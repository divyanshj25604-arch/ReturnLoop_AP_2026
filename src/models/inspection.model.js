// Queries for the return workflow. Functions take a `client` so callers can
// run them inside one transaction (see src/utils/transaction.js).

// Locks the return row until the transaction ends and returns its status,
// so two requests can't move the same return at the same time.
async function lockReturnStatus(client, returnId) {
  const result = await client.query(
    'SELECT status FROM returns WHERE return_id = $1 FOR UPDATE',
    [returnId]
  );
  return result.rows[0] ? result.rows[0].status : null;
}

async function setReturnStatus(client, returnId, status) {
  await client.query('UPDATE returns SET status = $1 WHERE return_id = $2', [status, returnId]);
}

// Inserts an inspection and returns it in the same shape as the
// "inspections" list in GET /returns/:id (including inspector_name).
async function createInspection(client, data) {
  const inserted = await client.query(
    `INSERT INTO inspections (
       return_id,
       inspector_id,
       condition_grade,
       functional_status,
       has_original_packaging,
       has_all_accessories,
       repair_estimate,
       diagnostic_notes
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING inspection_id`,
    [
      data.return_id,
      data.inspector_id,
      data.condition_grade,
      data.functional_status,
      data.has_original_packaging ?? false,
      data.has_all_accessories ?? false,
      data.repair_estimate ?? 0,
      data.diagnostic_notes || null,
    ]
  );

  const result = await client.query(
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
     WHERE i.inspection_id = $1`,
    [inserted.rows[0].inspection_id]
  );
  return result.rows[0];
}

module.exports = { lockReturnStatus, setReturnStatus, createInspection };
