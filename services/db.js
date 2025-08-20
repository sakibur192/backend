// backend/services/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // if using remote DB with SSL, set ssl: { rejectUnauthorized: false }
  ssl: false
});

pool.on('error', (err) => {
  console.error('Unexpected PG error', err);
});

(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connected');
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err);
  }
})();

module.exports = pool;
