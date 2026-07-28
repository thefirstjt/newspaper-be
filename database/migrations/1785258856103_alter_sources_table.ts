import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sources'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // True when the reader added this source themselves, so ranking can give
      // it a gentle edge over the default sources. Existing sources default to
      // false; the default and onboarding-discovered sources are not user-added.
      table.boolean('user_added').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('user_added')
    })
  }
}
