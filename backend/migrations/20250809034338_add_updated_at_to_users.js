// backend/migrations/[timestamp]_add_updated_at_to_users.js
// Run: npx knex migrate:make add_updated_at_to_users

export const up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

export const down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropColumn('updated_at');
  });
};