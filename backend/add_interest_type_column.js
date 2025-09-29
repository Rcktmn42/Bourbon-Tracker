// Temporary script to add interest_type column to user_watchlist table
import databaseManager from './config/databaseSafety.js';

async function addInterestTypeColumn() {
  try {
    await databaseManager.initialize();
    const userDb = databaseManager.getUserDb();

    // Check if column already exists
    const tableInfo = await userDb.raw("PRAGMA table_info(user_watchlist)");
    const hasInterestType = tableInfo.some(col => col.name === 'interest_type');

    if (!hasInterestType) {
      console.log('Adding interest_type column to user_watchlist table...');
      await userDb.raw(`
        ALTER TABLE user_watchlist
        ADD COLUMN interest_type TEXT DEFAULT 'interested'
        CHECK (interest_type IN ('interested', 'not_interested'))
      `);
      console.log('✅ Successfully added interest_type column');
    } else {
      console.log('✅ interest_type column already exists');
    }

    await databaseManager.shutdown();
  } catch (error) {
    console.error('❌ Error adding interest_type column:', error);
    process.exit(1);
  }
}

addInterestTypeColumn();