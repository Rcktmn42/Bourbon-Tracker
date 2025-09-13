// backend/config/db.js
// This file now proxies to the new databaseSafety.js for improved connection management
import databaseManager from './databaseSafety.js';

// Get the safe database connections from the manager
const getUserDb = () => databaseManager.getUserDb();
const getInventoryDb = () => databaseManager.getInventoryDb();

// Create function-based proxies that properly handle Knex query builder
function createDatabaseProxy(getDbFunction) {
  return new Proxy(function() {
    // Handle function calls like userDb('table_name')
    const db = getDbFunction();
    return db.apply(null, arguments);
  }, {
    get: (target, prop) => {
      // Handle property access like userDb.raw(), userDb.transaction(), etc.
      const db = getDbFunction();
      const value = db[prop];
      return typeof value === 'function' ? value.bind(db) : value;
    },
    apply: (target, thisArg, argumentsList) => {
      // Handle direct function calls
      const db = getDbFunction();
      return db.apply(thisArg, argumentsList);
    }
  });
}

// Create proxies for both databases
const userDb = createDatabaseProxy(getUserDb);
const inventoryDb = createDatabaseProxy(getInventoryDb);

// Export both connections (maintaining existing API)
export default userDb;  // Keep existing default export for user operations  
export { userDb, inventoryDb, databaseManager };