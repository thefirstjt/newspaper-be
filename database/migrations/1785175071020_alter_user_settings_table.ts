import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_settings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // The reader's IANA timezone (e.g. 'Africa/Lagos'). Their run time is a
      // wall-clock hour in this zone; the scheduler converts it to decide when
      // to build. Existing rows default to UTC, which is how run times were
      // always interpreted before per-reader timezones existed.
      table.string('timezone').notNullable().defaultTo('UTC')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('timezone')
    })
  }
}
