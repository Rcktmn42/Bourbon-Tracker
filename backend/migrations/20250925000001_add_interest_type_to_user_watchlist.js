/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.alterTable('user_watchlist', (table) => {
    // Add interest_type field to distinguish between 'interested' (custom items)
    // and 'not_interested' (default items user has disabled)
    table.enu('interest_type', ['interested', 'not_interested']).defaultTo('interested');

    // Add index for efficient filtering by interest_type
    table.index(['user_id', 'interest_type', 'active'], 'idx_user_watchlist_interest_type');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.alterTable('user_watchlist', (table) => {
    table.dropIndex(['user_id', 'interest_type', 'active'], 'idx_user_watchlist_interest_type');
    table.dropColumn('interest_type');
  });
}