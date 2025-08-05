// backend/migrations/‹timestamp›_create_stores_table.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('stores', table => {
    table.increments('store_id').primary();
    table.text('store_number').notNullable().unique();
    table.text('address').unique();
    table.text('region');
    table.text('nickname');
    table.integer('delivery_interval_days');
    table.date('last_delivery_date');
    table
      .integer('mixed_beverage')
      .notNullable()
      .defaultTo(0);
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('stores');
}
