import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // The onboarding screen the reader still needs to complete. Null once they
      // have finished all of onboarding.
      table.string('onboarding_step').nullable()
      table.timestamp('onboarding_completed_at').nullable()
    })

    // Existing readers are already onboarded: their step stays null (done), and
    // we stamp a completion time (their join date) so the field is consistent.
    this.defer(async (db) => {
      await db.rawQuery(
        'UPDATE users SET onboarding_completed_at = created_at WHERE onboarding_completed_at IS NULL'
      )
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('onboarding_step')
      table.dropColumn('onboarding_completed_at')
    })
  }
}
