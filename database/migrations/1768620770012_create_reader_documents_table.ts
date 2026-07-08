import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The living markdown documents that describe a reader (persona, preferences,
 * learning focus). Each reader has their own copy, seeded from the shipped
 * templates when they sign up and then kept up to date over time.
 */
export default class extends BaseSchema {
  protected tableName = 'reader_documents'

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
      table.string('key').notNullable()
      table.text('content').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['user_id', 'key'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
