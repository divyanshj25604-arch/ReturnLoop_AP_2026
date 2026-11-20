const { Pool, types } = require('pg');
const env = require('./env');

// pg returns NUMERIC (type OID 1700) as strings to avoid precision loss.
// Our money and score columns fit safely in a JS number, and docs/api.md
// promises numbers to the frontend, so parse them here once for every query.
const NUMERIC_OID = 1700;
types.setTypeParser(NUMERIC_OID, (value) => (value === null ? null : parseFloat(value)));

const poolConfig = env.databaseUrl
  ? { connectionString: env.databaseUrl }
  : {
      host: env.db.host,
      port: env.db.port,
      database: env.db.database,
      user: env.db.user,
      password: env.db.password,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

pool.pool = pool;
pool.query = pool.query.bind(pool);

module.exports = pool;
