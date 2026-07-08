import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Remembers the numeric X (Twitter) user id behind each handle, so the scout
 * only has to resolve a username to its id once and can reuse it on every later
 * run instead of spending an API call to look it up again. Each reader keeps
 * their own cache, so the mapping is scoped by user.
 */
export default class extends BaseSchema {
  protected tableName = 'x_accounts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .string('user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .index()
      table.string('username').notNullable()
      // The numeric id X assigns to the account (kept as a string).
      table.string('x_user_id').notNullable()
      table.timestamp('resolved_at').notNullable()

      table.unique(['user_id', 'username'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
