import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Item from '#models/item'

/**
 * Marks an item as discarded — the reader was not interested. This is a signal
 * preference learning treats as a gentle "less like this".
 */
export default class Discard extends BaseCommand {
  static commandName = 'newspaper:discard'
  static description = 'Discard an item the reader is not interested in'

  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'The id of the item to discard' })
  declare itemId: string

  async run() {
    const item = await Item.find(Number(this.itemId))
    if (!item) {
      this.logger.error(`No item found with id ${this.itemId}.`)
      this.exitCode = 1
      return
    }

    item.state = 'discarded'
    item.learnedAt = null
    await item.save()

    this.logger.success(`Discarded "${item.title}".`)
  }
}
