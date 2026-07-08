import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'seen_urls'

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
      table.string('url_hash').notNullable()
      table.text('url').notNullable()
      table.timestamp('first_seen_at').notNullable()

      table.unique(['user_id', 'url_hash'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
