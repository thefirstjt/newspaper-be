import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ratings'

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
      table
        .integer('item_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('items')
        .onDelete('CASCADE')
      table.integer('stars').notNullable()
      table.text('note').nullable()
      // Set once this rating has been folded into the reader's preferences.
      table.timestamp('learned_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
