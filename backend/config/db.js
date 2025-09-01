// backend/config/db.js
import knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// User/Authentication Database (existing)
const userDbConfig = {
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, '..', 'data', 'database.sqlite3')
  },
  useNullAsDefault: true,
  pool: {
    min: 0,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100
  }
};

// Inventory Database (bourbon tracking data)
const inventoryDbConfig = {
  client: 'sqlite3',
  connection: {
    filename: process.env.NODE_ENV === 'production' 
      ? '/opt/BourbonDatabase/inventory.db'
      : path.join(__dirname, '..', '..', 'BourbonDatabase', 'inventory.db')
  },
  useNullAsDefault: true,
  pool: {
    min: 0,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100
  }
};

// Create database connections
const userDb = knex(userDbConfig);
const inventoryDb = knex(inventoryDbConfig);

// Export both connections
export default userDb;  // Keep existing default export for user operations
export { userDb, inventoryDb };