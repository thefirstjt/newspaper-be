import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'editions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // The edition's front-page headline and a one-paragraph summary of the
      // day, synthesised from its stories. Used as the email subject and shown
      // by the frontend. Null until the build writes them.
      table.string('headline').nullable()
      table.text('summary').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('headline')
      table.dropColumn('summary')
    })
  }
}
