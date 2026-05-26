import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'seen_urls'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('url_hash').notNullable().unique()
      table.text('url').notNullable()
      table.timestamp('first_seen_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
