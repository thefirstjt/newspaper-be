import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import newspaperConfig from '#config/newspaper'
import Edition from '#models/edition'
import Item from '#models/item'

/**
 * Prints a day's edition to the terminal — the surfaced stories for each
 * category with their summary and link — so an edition can be read before there
 * is an API or email to deliver it. Defaults to today; pass --date for another.
 */
export default class ShowEdition extends BaseCommand {
  static commandName = 'newspaper:show-edition'
  static description = "Print a day's edition (surfaced stories per category) to the terminal"

  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'The day to show, as YYYY-MM-DD (defaults to today)' })
  declare date?: string

  async run() {
    const date = this.date ?? DateTime.now().toISODate()!

    const edition = await Edition.findBy('date', date)
    if (!edition) {
      this.logger.warning(`No edition found for ${date}. Run "node ace newspaper:run-daily" first.`)
      return
    }

    const surfaced = await Item.query()
      .where('edition_id', edition.id)
      .where('state', 'surfaced')
      .orderBy('category_key')
      .orderBy('rank')

    this.logger.info(`Edition for ${edition.date}\n`)

    for (const category of newspaperConfig.categories) {
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
