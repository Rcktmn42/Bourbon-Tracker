// backend/migrations/20250802013046_create_users_table.js

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('users', table => {
    table.increments('user_id').primary();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('email').notNullable().unique();
    table.string('password_hash').notNullable();
    table
      .enu('role', ['admin','power_user','user'])
      .notNullable()
      .defaultTo('user');
    table.timestamps(true, true);  // adds created_at & updated_at
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('users');
}
