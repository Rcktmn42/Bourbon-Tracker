/**
 * Add notify_frequency column to users table
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const hasColumn = await knex.schema.hasColumn('users', 'notify_frequency');

  if (!hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.string('notify_frequency').defaultTo('hourly');
    });

    console.log('✅ Added notify_frequency column to users table');
  } else {
    console.log('ℹ️  notify_frequency column already exists');
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('notify_frequency');
  });

  console.log('✅ Removed notify_frequency column from users table');
}
