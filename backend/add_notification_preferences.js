// Temporary script to add notification preferences to users table
import databaseManager from './config/databaseSafety.js';

async function addNotificationPreferences() {
  try {
    await databaseManager.initialize();
    const userDb = databaseManager.getUserDb();

    // Check if columns already exist
    const tableInfo = await userDb.raw("PRAGMA table_info(users)");
    const hasNotifyEmail = tableInfo.some(col => col.name === 'notify_email');
    const hasNotifyText = tableInfo.some(col => col.name === 'notify_text');

    if (!hasNotifyEmail) {
      console.log('Adding notify_email column to users table...');
      await userDb.raw(`
        ALTER TABLE users
        ADD COLUMN notify_email BOOLEAN DEFAULT 1
      `);
      console.log('✅ Successfully added notify_email column');
    } else {
      console.log('✅ notify_email column already exists');
    }

    if (!hasNotifyText) {
      console.log('Adding notify_text column to users table...');
      await userDb.raw(`
        ALTER TABLE users
        ADD COLUMN notify_text BOOLEAN DEFAULT 0
      `);
      console.log('✅ Successfully added notify_text column');
    } else {
      console.log('✅ notify_text column already exists');
    }

    await databaseManager.shutdown();
  } catch (error) {
    console.error('❌ Error adding notification preferences:', error);
    process.exit(1);
  }
}

addNotificationPreferences();