/**
 * Create watchlist_audit_log table for tracking changes
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const exists = await knex.schema.hasTable('watchlist_audit_log');

  if (!exists) {
    await knex.schema.createTable('watchlist_audit_log', (table) => {
      table.increments('log_id').primary();
      table.integer('user_id').notNullable();
      table.string('action').notNullable();
      table.integer('plu');
      table.text('details');
      table.string('ip_address');
      table.text('user_agent');
      table.datetime('created_at').defaultTo(knex.fn.now());

      // Foreign key
      table.foreign('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');

      // Indexes
      table.index('user_id', 'idx_audit_user');
      table.index('action', 'idx_audit_action');
      table.index('created_at', 'idx_audit_created_at');
    });

    console.log('✅ Created watchlist_audit_log table');
  } else {
    console.log('ℹ️  watchlist_audit_log table already exists');
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('watchlist_audit_log');

  console.log('✅ Dropped watchlist_audit_log table');
}
