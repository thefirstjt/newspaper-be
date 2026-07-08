import { args, BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Item from '#models/item'
import Rating from '#models/rating'
import { SeenUrlStore } from '#services/scout/seen_url_store'
import { resolveUser } from '#services/support/resolve_user'

/**
 * Records a reader's rating for one of their items, so it can feed preference
 * learning. Re-rating an item replaces the previous rating and marks it to be
 * learned from again. Defaults to the sole active user; pass --user for another.
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

  @flags.string({ description: 'The reader, by email (defaults to the sole active user)' })
  declare user?: string

  async run() {
    const itemId = Number(this.itemId)
    const stars = Number(this.stars)

    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      this.logger.error('Stars must be a whole number from 1 to 5.')
      this.exitCode = 1
      return
    }

    const reader = await resolveUser(this.user)
    const item = await Item.query().where('user_id', reader.id).where('id', itemId).first()
    if (!item) {
      this.logger.error(`No item found with id ${itemId} for ${reader.email}.`)
      this.exitCode = 1
      return
    }

    await Rating.updateOrCreate(
      { itemId },
      { userId: reader.id, itemId, stars, note: this.note ?? null, learnedAt: null }
    )
    item.state = 'rated'
    await item.save()
    await new SeenUrlStore(reader.id).markSeen([item])

    this.logger.success(`Rated "${item.title}" ${stars}/5.`)
  }
}
