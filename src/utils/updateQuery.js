// Builds "SET a = $1, b = $2" for a PATCH from the fields that were sent.
// `values` holds only validated fields; `allowed` is the list of updatable
// column names (never taken from the request, so it's safe to put in SQL).
// Returns null when there is nothing to update.
function buildUpdate(values, allowed) {
  const columns = allowed.filter((column) => values[column] !== undefined);
  if (columns.length === 0) {
    return null;
  }
  return {
    setClause: columns.map((column, i) => `${column} = $${i + 1}`).join(', '),
    params: columns.map((column) => values[column]),
  };
}

module.exports = buildUpdate;
