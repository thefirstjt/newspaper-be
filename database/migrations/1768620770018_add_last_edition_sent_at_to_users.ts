import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Records when a reader was last sent an edition by email, so it can be shown to
 * admins and used to reason about delivery.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.timestamp('last_edition_sent_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('last_edition_sent_at')
    })
  }
}
