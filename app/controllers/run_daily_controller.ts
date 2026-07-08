import { DateTime } from 'luxon'
import { createEditionBuilder } from '#services/edition/edition_builder'
import { createPreferenceLearner } from '#services/preferences/preference_learner'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Runs the daily pipeline on demand — the same work the `newspaper:run-daily`
 * command does — so the reader can rebuild today's edition from the API. It runs
 * inline and returns once the edition is ready, which suits a single-user tool
 * where a manual rebuild is an occasional, deliberate act.
 */
export default class RunDailyController {
  async store({ logger, serialize }: HttpContext) {
    const date = DateTime.now().toISODate()!

    await createPreferenceLearner().learn()
    const { edition, failures } = await createEditionBuilder(logger).build(date)

    return serialize({
      date: edition.date,
      status: edition.status,
      failures: failures.map((failure) => ({
        source: failure.sourceName,
        message: failure.message,
      })),
    })
  }
}
