import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import Edition from '#models/edition'
import Item from '#models/item'
import { loadCategories } from '#services/edition/edition_builder'
import { resolveUser } from '#services/support/resolve_user'

/**
 * Prints a reader's edition for a day to the terminal — the surfaced stories for
 * each category with their summary and link. Defaults to today and the sole
 * active user; pass --date and --user to pick another.
 */
export default class ShowEdition extends BaseCommand {
  static commandName = 'newspaper:show-edition'
  static description = "Print a day's edition (surfaced stories per category) to the terminal"

  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'The day to show, as YYYY-MM-DD (defaults to today)' })
  declare date?: string

  @flags.string({ description: 'The reader, by email (defaults to the sole active user)' })
  declare user?: string

  async run() {
    const date = this.date ?? DateTime.now().toISODate()!
    const user = await resolveUser(this.user)

    const edition = await Edition.query().where('user_id', user.id).where('date', date).first()
    if (!edition) {
      this.logger.warning(`No edition found for ${date}. Run "node ace newspaper:run-daily" first.`)
      return
    }

    const surfaced = await Item.query()
      .where('edition_id', edition.id)
      .where('state', 'surfaced')
      .orderBy('category_key')
      .orderBy('rank')

    const categories = await loadCategories(user.id)
    this.logger.info(`Edition for ${edition.date}\n`)

    for (const category of categories) {
      const items = surfaced.filter((item) => item.categoryKey === category.key)
      if (items.length === 0) {
        continue
      }

      this.logger.info(`## ${category.title}`)
      for (const item of items) {
        this.logger.info(`  • ${item.title} (${item.sourceName})`)
        if (item.summary) {
          this.logger.info(`    ${item.summary}`)
        }
        this.logger.info(`    ${item.url}\n`)
      }
    }
  }
}
