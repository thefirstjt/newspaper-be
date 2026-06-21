import { args, BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Item from '#models/item'
import Rating from '#models/rating'

/**
 * Records the reader's rating for an item, so it can feed preference learning.
 * Re-rating an item replaces the previous rating and marks it to be learned
 * from again.
 */
export default class Rate extends BaseCommand {
  static commandName = 'newspaper:rate'
  static description = "Rate an item from 1 to 5 to teach the newspaper the reader's tastes"

  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'The id of the item to rate' })
  declare itemId: string

  @args.string({ description: 'A score from 1 to 5' })
  declare stars: string

  @flags.string({ description: 'An optional note on why' })
  declare note?: string

  async run() {
    const itemId = Number(this.itemId)
    const stars = Number(this.stars)

    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      this.logger.error('Stars must be a whole number from 1 to 5.')
      this.exitCode = 1
      return
    }

    const item = await Item.find(itemId)
    if (!item) {
      this.logger.error(`No item found with id ${itemId}.`)
      this.exitCode = 1
      return
    }

    await Rating.updateOrCreate(
      { itemId },
      { itemId, stars, note: this.note ?? null, learnedAt: null }
    )
    item.state = 'rated'
    await item.save()

    this.logger.success(`Rated "${item.title}" ${stars}/5.`)
  }
}
