import { DateTime } from 'luxon'
import { editionChannelFor, makeDailyRunDispatcher } from '#services/edition/daily_run'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Kicks off the daily pipeline for the authenticated reader — the same work the
 * `newspaper:run-daily` command does. Building the edition is slow (scouting,
 * ranking and summarising with the models), so it is queued rather than run
 * inline. We return the reader's Transmit channel; the frontend shows a loader
 * and subscribes, and the job broadcasts the finished edition (or a failure)
 * there when it is done.
 *
 * By default it builds today's edition, but an optional `date` (YYYY-MM-DD) can
 * be given to (re)build a specific day. Rebuilding is safe: the builder replaces
 * the existing edition for that date rather than adding a second one, so this
 * doubles as a "retrigger the build" endpoint.
 */
export default class RunDailyController {
  async store({ auth, request, response }: HttpContext) {
    const user = auth.use('api').getUserOrFail()

    const date = this.resolveDate(request.input('date'))
    if (!date) {
      return response.unprocessableEntity({ error: 'Provide a valid date as YYYY-MM-DD.' })
    }

    await makeDailyRunDispatcher().dispatch(user.id, date)

    return response.accepted({ data: { channel: editionChannelFor(user.id) } })
  }

  /**
   * Today when no date is given; otherwise the given day normalised to
   * YYYY-MM-DD, or null when it is not a valid date.
   */
  private resolveDate(input: unknown): string | null {
    if (input === undefined || input === null || input === '') {
      return DateTime.now().toISODate()
    }
    if (typeof input !== 'string') {
      return null
    }
    return DateTime.fromISO(input).toISODate()
  }
}
