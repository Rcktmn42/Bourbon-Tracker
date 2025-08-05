// backend/config/db.js

// Load .env first
import 'dotenv/config';

import knex from 'knex';

// Choose your client (sqlite3 today, pg later)
const client = process.env.DB_CLIENT || 'sqlite3';
const databaseUrl = process.env.DATABASE_URL || './data/database.sqlite3';

// Build the Knex instance
const db = knex({
  client,
  connection:
    client === 'sqlite3'
      ? { filename: databaseUrl }
      : databaseUrl,
  useNullAsDefault: client === 'sqlite3'
});

export default db;
