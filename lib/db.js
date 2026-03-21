const { Pool } = require('pg');

let pool;

function getDatabaseUrl() {
  return process.env.DB9_DATABASE_URL || process.env.DATABASE_URL || '';
}

function getPool() {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error('Missing DB9_DATABASE_URL or DATABASE_URL');
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: process.env.DB9_SSL === 'false' ? false : { rejectUnauthorized: false }
    });
  }

  return pool;
}

module.exports = {
  getDatabaseUrl,
  getPool
};
