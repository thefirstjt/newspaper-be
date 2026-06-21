import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Tracks when a rating or a discard has been folded into the reader's
 * preferences, so the preference learner never applies the same signal twice.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('ratings', (table) => {
      table.timestamp('learned_at').nullable()
    })
    this.schema.alterTable('items', (table) => {
      table.timestamp('learned_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable('ratings', (table) => {
      table.dropColumn('learned_at')
    })
    this.schema.alterTable('items', (table) => {
      table.dropColumn('learned_at')
    })
  }
}
