import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * One row per on-demand edition rebuild, so we can see how many rebuilds a reader
 * has had and whether an admin triggered them.
 */
export default class extends BaseSchema {
  protected tableName = 'rebuild_logs'

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
      table.boolean('triggered_by_admin').notNullable()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
