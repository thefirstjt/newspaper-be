import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Access tokens for admins, kept in their own table because the reader token
 * table's foreign key points at `users`. The tokenable id is an integer here,
 * matching the admins' auto-increment primary key.
 */
export default class extends BaseSchema {
  protected tableName = 'admin_access_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('tokenable_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('admins')
        .onDelete('CASCADE')

      table.string('type').notNullable()
      table.string('name').nullable()
      table.string('hash').notNullable()
      table.text('abilities').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.timestamp('last_used_at').nullable()
      table.timestamp('expires_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
