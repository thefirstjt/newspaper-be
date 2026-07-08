import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * A reader's newspaper sections. Each category belongs to one user and groups
 * that user's sources; it also carries how many items to surface per day and the
 * relevance guidance given to the ranking model.
 */
export default class extends BaseSchema {
  protected tableName = 'categories'

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
      table.string('title').notNullable()
      table.integer('min').notNullable()
      table.integer('max').notNullable()
      table.integer('pool_size').notNullable()
      table.text('relevance_hint').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['user_id', 'key'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
