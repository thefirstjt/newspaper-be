import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sources'

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
        .integer('category_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('categories')
        .onDelete('CASCADE')
      table.string('type').notNullable()
      table.string('name').notNullable()
      table.text('settings').notNullable()
      table.boolean('enabled').notNullable().defaultTo(true)
      table.timestamp('last_fetched_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['category_id', 'name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
