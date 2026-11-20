const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function setupDatabase() {
  const schemaPath = path.join(__dirname, '../dbms/03_schema.sql');
  const seedPath = path.join(__dirname, '../dbms/04_seed.sql');

  console.log('Starting Return Loop database setup...');

  try {
    // Verify file existence
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found at ${seedPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log('1. Executing schema DDL (dbms/03_schema.sql)...');
    await pool.query(schemaSql);
    console.log('   ✓ Schema created successfully.');

    console.log('2. Inserting seed data (dbms/04_seed.sql)...');
    await pool.query(seedSql);
    console.log('   ✓ Seed data inserted successfully.');

    console.log('Database setup complete. All tables and seed records are ready.');
    process.exitCode = 0;
  } catch (err) {
    console.error('Database setup failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

setupDatabase();
