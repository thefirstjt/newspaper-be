import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      // A UUID v7 string, assigned by the model before insert.
      table.string('id').notNullable().primary()
      table.string('name').nullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('last_logged_in_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
