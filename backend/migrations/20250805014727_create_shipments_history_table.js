// backend/migrations/20250805014727_create_shipments_history_table.js

/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  await knex.schema.createTable('shipments_history', table => {
    table.increments('shipment_id').primary();
    table.text('nc_code').notNullable();
    table
      .integer('board_id')
      .notNullable()
      .references('board_id')
      .inTable('boards');
    table.date('ship_date').notNullable();
    table.integer('num_units').notNullable();
    table.unique(['nc_code', 'board_id', 'ship_date']);
  });
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('shipments_history');
}
