const db = require('../config/db');

// Runs `work(client)` inside BEGIN / COMMIT on one pooled connection.
// Any error rolls everything back and is re-thrown. Use the given client
// (not db.query) for every query that must be part of the transaction.
async function withTransaction(work) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = withTransaction;
