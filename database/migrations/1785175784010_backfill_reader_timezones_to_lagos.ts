import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Every reader that predates per-reader timezones was defaulted to UTC when the
 * timezone column was added, but they are all in Nigeria. Move those UTC rows to
 * Africa/Lagos so their run times mean local time. Rows a reader has since set to
 * some other zone are left untouched, and new accounts still default to UTC.
 */
export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db.from('user_settings').where('timezone', 'UTC').update({ timezone: 'Africa/Lagos' })
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.from('user_settings').where('timezone', 'Africa/Lagos').update({ timezone: 'UTC' })
    })
  }
}
