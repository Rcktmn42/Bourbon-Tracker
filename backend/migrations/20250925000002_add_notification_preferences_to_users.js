/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.alterTable('users', (table) => {
    // Add user-level notification preferences
    table.boolean('notify_email').defaultTo(true);
    table.boolean('notify_text').defaultTo(false);

    // Add index for notification queries
    table.index(['notify_email', 'notify_text'], 'idx_users_notifications');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropIndex(['notify_email', 'notify_text'], 'idx_users_notifications');
    table.dropColumn('notify_email');
    table.dropColumn('notify_text');
  });
}