// backend/migrations/‹timestamp›_create_current_inventory_table.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('current_inventory', table => {
    table.increments('inventory_id').primary();
    table
      .integer('store_id')
      .notNullable()
      .references('store_id')
      .inTable('stores');
    table.integer('plu').notNullable();
    table.integer('quantity');
    table
      .timestamp('last_updated', { useTz: false })
      .defaultTo(knex.fn.now());
    table.unique(['store_id','plu']);
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('current_inventory');
}
