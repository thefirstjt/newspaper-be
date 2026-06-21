import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Remembers the numeric X (Twitter) user id behind each handle, so the scout
 * only has to resolve a username to its id once and can reuse it on every later
 * run instead of spending an API call to look it up again.
 */
export default class extends BaseSchema {
  protected tableName = 'x_accounts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('username').notNullable().unique()
      table.string('user_id').notNullable()
      table.timestamp('resolved_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
