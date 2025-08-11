/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.string('phone_number', 20).nullable().index();
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('phone_number');
  });
}
