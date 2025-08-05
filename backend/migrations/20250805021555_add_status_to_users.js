// backend/migrations/‹timestamp›_add_status_to_users.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.alterTable('users', table => {
    table
      .enu('status', ['pending','active','disabled'], {
        useNative: true,
        enumName: 'user_status'
      })
      .notNullable()
      .defaultTo('pending');
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.alterTable('users', table => {
    table.dropColumn('status');
  });
  // If you want to drop the enum type (Postgres only), you could do:
  // await knex.raw('DROP TYPE IF EXISTS user_status');
}
