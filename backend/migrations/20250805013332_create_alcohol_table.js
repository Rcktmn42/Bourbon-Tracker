// backend/migrations/‹timestamp›_create_alcohol_table.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('alcohol', table => {
    table.increments('alcohol_id').primary();
    table.integer('nc_code').notNullable().unique();
    table.text('brand_name');
    table.integer('size_ml');
    table.integer('cases_per_pallet');
    table.text('supplier');
    table.text('broker_name');
    table.date('first_seen_date');
    table.text('image_path');
    table.text('listing_type');
    table.text('style_tags');
    table.text('alcohol_type');
    table.text('alcohol_subtype');
    table.float('retail_price');
    table.integer('bottles_per_case');
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('alcohol');
}
