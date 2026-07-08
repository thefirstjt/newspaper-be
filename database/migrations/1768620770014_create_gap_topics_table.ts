import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The learning gaps a reader wants the key learning and quiz to focus on, kept
 * as an ordered list so the model can draw from them each day.
 */
export default class extends BaseSchema {
  protected tableName = 'gap_topics'

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
      table.text('topic').notNullable()
      table.integer('position').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
