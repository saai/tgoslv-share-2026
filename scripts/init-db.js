const fs = require('fs');
const path = require('path');
const { getPool } = require('../lib/db');

async function main() {
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const pool = getPool();
  await pool.query(schema);
  console.log('db9 schema initialized successfully.');
  await pool.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
