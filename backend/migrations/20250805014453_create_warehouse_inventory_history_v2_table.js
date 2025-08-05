// backend/migrations/‹timestamp›_create_warehouse_inventory_history_v2_table.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('warehouse_inventory_history_v2', table => {
    table.increments('history_id').primary();
    table.text('nc_code').notNullable();
    table.date('check_date').notNullable();
    table.integer('total_available');
    table.text('listing_type');
    table.integer('supplier_allotment');
    table
      .unique(['nc_code', 'check_date']);
    // If you want to enforce the old FK to alcohol_old, uncomment:
    // table.foreign('nc_code').references('nc_code').inTable('alcohol_old');
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('warehouse_inventory_history_v2');
}
