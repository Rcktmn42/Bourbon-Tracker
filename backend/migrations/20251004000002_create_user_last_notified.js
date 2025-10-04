/**
 * Create user_last_notified table for notification watermarks
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const exists = await knex.schema.hasTable('user_last_notified');

  if (!exists) {
    await knex.schema.createTable('user_last_notified', (table) => {
      table.integer('user_id').notNullable();
      table.integer('plu').notNullable();
      table.datetime('last_notified').defaultTo(knex.fn.now());
      table.integer('notification_count').defaultTo(0);

      // Primary key
      table.primary(['user_id', 'plu']);

      // Foreign key
      table.foreign('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');

      // Index for queries
      table.index('user_id', 'idx_user_last_notified_user');
    });

    console.log('✅ Created user_last_notified table');
  } else {
    console.log('ℹ️  user_last_notified table already exists');
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('user_last_notified');

  console.log('✅ Dropped user_last_notified table');
}
