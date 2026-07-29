import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * A source is unique by name within a category *and* type, not name alone. This
 * lets the same outlet appear as both an RSS feed and a YouTube channel in one
 * category (e.g. a TV station with both a website feed and a channel) without
 * colliding.
 */
export default class extends BaseSchema {
  protected tableName = 'sources'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['category_id', 'name'])
      table.unique(['category_id', 'name', 'type'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['category_id', 'name', 'type'])
      table.unique(['category_id', 'name'])
    })
  }
}
