import Item from '#models/item'
import Rating from '#models/rating'
import { SeenUrlStore } from '#services/scout/seen_url_store'
import { HeadlineManager } from '#services/orchestrator/headline_manager'
import { presentItem } from '#transformers/newspaper_presenter'
import { rateValidator } from '#validators/newspaper'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Handles the reader's judgements on individual items. Both actions teach the
 * newspaper: a rating is an explicit signal, and a discard is a gentle "less
 * like this". Rating or discarding also burns the item's url so it never comes
 * back around in a future edition.
 */
export default class ItemsController {
  /** Records a 1–5 rating (with an optional note) for the reader's item. */
  async rate({ auth, params, request, serialize, response }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const item = await Item.query().where('user_id', user.id).where('id', params.id).first()
    if (!item) {
      return response.notFound({ error: `There is no item with id ${params.id}.` })
    }

    const { stars, note } = await request.validateUsing(rateValidator)

    await Rating.updateOrCreate(
      { itemId: item.id },
      { userId: user.id, itemId: item.id, stars, note: note ?? null, learnedAt: null }
    )
    item.state = 'rated'
    await item.save()
    await new SeenUrlStore(user.id).markSeen([item])

    await item.load('rating')
    return serialize(presentItem(item))
  }

  /**
   * Discards a surfaced item and, if the category still has a reserve waiting,
   * promotes the next one in its place — summarising it on the way up so it is
   * ready to read. Returns both the discarded item and its replacement (which is
   * null when the reserve pool for that category is empty).
   */
  async discard({ auth, params, serialize, response }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const item = await Item.query().where('user_id', user.id).where('id', params.id).first()
    if (!item) {
      return response.notFound({ error: `There is no item with id ${params.id}.` })
    }
    if (item.state !== 'surfaced') {
      return response.unprocessableEntity({
        error: 'Only a surfaced item can be discarded.',
      })
    }

    item.state = 'discarded'
    item.learnedAt = null
    await item.save()

    const promoted = await this.promoteNextReserve(item)

    return serialize({
      discarded: presentItem(item),
      promoted: promoted ? presentItem(promoted) : null,
    })
  }

  /**
   * Reveals the highest-ranked reserve in the discarded item's category: marks
   * it surfaced, gives it a summary if it does not already have one, and records
   * its url as seen. Returns null when there is no reserve left.
   */
  private async promoteNextReserve(discarded: Item): Promise<Item | null> {
    const next = await Item.query()
      .where('user_id', discarded.userId)
      .where('edition_id', discarded.editionId)
      .where('category_key', discarded.categoryKey)
      .where('state', 'reserve')
      .orderBy('rank')
      .first()

    if (!next) {
      return null
    }

    if (!next.summary) {
      next.summary = await new HeadlineManager().summarizeArticle({
        title: next.title,
        sourceName: next.sourceName ?? 'Unknown source',
        content: next.snippet ?? '',
      })
    }

    next.state = 'surfaced'
    await next.save()
    await new SeenUrlStore(discarded.userId).markSeen([next])

    return next
  }
}
