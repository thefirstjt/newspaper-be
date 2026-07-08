import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'items'

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
      table.string('category_key').notNullable()

      table.text('url').notNullable()
      table.string('url_hash').notNullable().index()
      table.text('title').notNullable()
      table.string('author').nullable()
      table.string('source_name').nullable()
      table.timestamp('published_at').nullable()
      table.string('media_type').notNullable().defaultTo('article')

      table.text('snippet').nullable()
      table.text('full_text').nullable()
      table.text('summary').nullable()

      table.float('relevance_score').nullable()
      table.integer('rank').nullable()
      table.string('state').notNullable().defaultTo('reserve')
      table.boolean('is_user_submitted').notNullable().defaultTo(false)
      // Set once a discard has been folded into the reader's preferences.
      table.timestamp('learned_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
