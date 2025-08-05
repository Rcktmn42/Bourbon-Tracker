// backend/migrations/‹timestamp›_create_boards_table.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('boards', table => {
    table.increments('board_id').primary();
    table.text('board_name').notNullable().unique();
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('boards');
}
