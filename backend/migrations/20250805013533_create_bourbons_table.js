// backend/migrations/‹timestamp›_create_bourbons_table.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('bourbons', table => {
    table.increments('bourbon_id').primary();
    table.text('name').notNullable();
    table.integer('plu').notNullable().unique();
    table.date('last_seeded_date');
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('bourbons');
}
