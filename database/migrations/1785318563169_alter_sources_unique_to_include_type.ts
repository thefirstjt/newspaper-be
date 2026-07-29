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
    // Add the new unique first: on MySQL the category_id foreign key needs an
    // index, and it is the (category_id, name) unique that currently covers it.
    // The new (category_id, name, type) unique covers the FK too (same leftmost
    // column), so once it exists the old one can be dropped.
    this.schema.alterTable(this.tableName, (table) => {
      table.unique(['category_id', 'name', 'type'])
    })
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['category_id', 'name'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.unique(['category_id', 'name'])
    })
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['category_id', 'name', 'type'])
    })
  }
}
