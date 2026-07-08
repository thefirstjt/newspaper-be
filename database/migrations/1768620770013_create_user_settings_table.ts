import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * A reader's scalar preferences: how many quiz questions to generate, when the
 * daily pipeline runs, and how their edition is emailed. One row per user.
 */
export default class extends BaseSchema {
  protected tableName = 'user_settings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .string('user_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.integer('quiz_min').notNullable()
      table.integer('quiz_max').notNullable()
      table.string('run_time').notNullable()
      table.boolean('email_enabled').notNullable().defaultTo(true)
      // How often the reader is emailed: 'daily', 'weekly' or 'monthly'.
      table.string('email_frequency').notNullable().defaultTo('daily')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
