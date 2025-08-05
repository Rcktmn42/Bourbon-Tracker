// backend/migrations/‹timestamp›_create_inventory_history_table.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('inventory_history', table => {
    table.increments('history_id').primary();
    table
      .integer('store_id')
      .notNullable()
      .references('store_id')
      .inTable('stores');
    table.integer('plu').notNullable();
    table.integer('quantity');
    table.date('snapshot_date').notNullable();
    table.unique(['store_id','plu','snapshot_date']);
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('inventory_history');
}
