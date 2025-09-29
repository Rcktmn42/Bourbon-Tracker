// Temporary script to check users table schema
import databaseManager from './config/databaseSafety.js';

async function checkUsersSchema() {
  try {
    await databaseManager.initialize();
    const userDb = databaseManager.getUserDb();

    // Check users table schema
    const tableInfo = await userDb.raw("PRAGMA table_info(users)");
    console.log('Users table columns:', tableInfo);

    await databaseManager.shutdown();
  } catch (error) {
    console.error('❌ Error checking schema:', error);
    process.exit(1);
  }
}

checkUsersSchema();