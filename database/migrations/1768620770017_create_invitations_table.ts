import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Invitations an admin sends to prospective readers. Each carries a single-use
 * magic-link token that expires after three days; accepting it creates the
 * reader's account and links back to it.
 */
export default class extends BaseSchema {
  protected tableName = 'invitations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('email', 254).notNullable().index()
      table.string('token').notNullable().unique()
      table.string('status').notNullable().defaultTo('pending')
      table.timestamp('expires_at').notNullable()
      table
        .string('accepted_user_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table
        .integer('invited_by_admin_id')
        .nullable()
        .references('id')
        .inTable('admins')
        .onDelete('SET NULL')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
