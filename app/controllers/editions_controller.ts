import { DateTime } from 'luxon'
import Edition from '#models/edition'
import { presentEdition } from '#transformers/newspaper_presenter'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Serves the reader's daily edition: the surfaced items grouped by category,
 * the key learning, and the quiz. Reserves are never exposed here — they are
 * only revealed one at a time when a surfaced item is discarded.
 */
export default class EditionsController {
  /** The edition for today. */
  async today(ctx: HttpContext) {
    return this.showForDate(DateTime.now().toISODate()!, ctx)
  }

  /** The edition for a specific day, given as YYYY-MM-DD. */
  async show(ctx: HttpContext) {
    return this.showForDate(ctx.params.date, ctx)
  }

  private async showForDate(date: string, { auth, serialize, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const edition = await Edition.query()
      .where('user_id', user.id)
      .where('date', date)
      .preload('items', (items) =>
        items.where('state', 'surfaced').preload('rating').orderBy('rank')
      )
      .preload('quizQuestions')
      .first()

    if (!edition) {
      return response.notFound({ error: `There is no edition for ${date}.` })
    }

    return serialize(presentEdition(edition, edition.items, edition.quizQuestions))
  }
}
