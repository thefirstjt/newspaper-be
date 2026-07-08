import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'quiz_questions'

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
        .integer('edition_id')
        .notNullable()
        .references('id')
        .inTable('editions')
        .onDelete('CASCADE')
      table.string('topic').notNullable()
      table.text('question').notNullable()
      table.text('options').notNullable()
      table.integer('correct_index').notNullable()
      table.text('explanation').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
