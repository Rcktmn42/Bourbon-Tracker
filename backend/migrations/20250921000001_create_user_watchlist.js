/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('user_watchlist', (table) => {
    table.increments('watch_id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('plu').notNullable();
    table.text('custom_name');
    table.boolean('notify_email').defaultTo(true);
    table.boolean('notify_text').defaultTo(false);
    table.boolean('active').defaultTo(true);
    table.datetime('added_on').defaultTo(knex.fn.now());

    // Composite unique constraint and index
    table.unique(['user_id', 'plu']);
    table.index(['user_id', 'plu', 'active'], 'idx_user_watchlist_user_plu_active');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('user_watchlist');
}