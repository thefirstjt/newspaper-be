import { args, BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Item from '#models/item'
import { resolveUser } from '#services/support/resolve_user'

/**
 * Marks one of a reader's items as discarded — they were not interested. This is
 * a signal preference learning treats as a gentle "less like this". Defaults to
 * the sole active user; pass --user for another.
 */
export default class Discard extends BaseCommand {
  static commandName = 'newspaper:discard'
  static description = 'Discard an item the reader is not interested in'

  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'The id of the item to discard' })
  declare itemId: string

  @flags.string({ description: 'The reader, by email (defaults to the sole active user)' })
  declare user?: string

  async run() {
    const reader = await resolveUser(this.user)
    const item = await Item.query()
      .where('user_id', reader.id)
      .where('id', Number(this.itemId))
      .first()
    if (!item) {
      this.logger.error(`No item found with id ${this.itemId} for ${reader.email}.`)
      this.exitCode = 1
      return
    }

    item.state = 'discarded'
    item.learnedAt = null
    await item.save()

    this.logger.success(`Discarded "${item.title}".`)
  }
}
