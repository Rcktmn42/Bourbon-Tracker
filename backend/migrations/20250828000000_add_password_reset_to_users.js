/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.alterTable('users', function (table) {
    table.string('password_reset_token', 255).nullable();
    table.datetime('password_reset_expires').nullable();
    table.integer('password_reset_attempts').defaultTo(0);
    table.datetime('password_reset_last_attempt').nullable();
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.alterTable('users', function (table) {
    table.dropColumn('password_reset_token');
    table.dropColumn('password_reset_expires');
    table.dropColumn('password_reset_attempts');
    table.dropColumn('password_reset_last_attempt');
  });
}