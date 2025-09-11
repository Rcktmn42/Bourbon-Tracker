/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Add delivery_day column to stores table
  await knex.schema.table('stores', function(table) {
    table.string('delivery_day');
  });
  
  console.log('✅ Added delivery_day column (empty - to be populated with real data)');
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // Remove delivery_day column
  await knex.schema.table('stores', function(table) {
    table.dropColumn('delivery_day');
  });
  
  console.log('✅ Removed delivery_day column');
}
