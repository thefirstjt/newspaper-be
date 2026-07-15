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
 */
export default class RunDailyController {
  async store({ auth, response }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const date = DateTime.now().toISODate()!

    await makeDailyRunDispatcher().dispatch(user.id, date)

    return response.accepted({ data: { channel: editionChannelFor(user.id) } })
  }
}
