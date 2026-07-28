import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * A global cache mapping a YouTube channel handle to its UC… channel id.
 * Resolving a handle costs an API call, so once any reader has looked one up we
 * remember it here and every later add of the same handle reuses it. The mapping
 * is universal (a handle points at the same channel for everyone), so unlike the
 * per-reader x_accounts cache this table is not scoped by user.
 */
export default class extends BaseSchema {
  protected tableName = 'youtube_channels'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      // The channel handle, stored lower-cased and without the leading @.
      table.string('handle').notNullable().unique()
      // The UC… channel id the handle resolves to.
      table.string('channel_id').notNullable()
      table.timestamp('resolved_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
