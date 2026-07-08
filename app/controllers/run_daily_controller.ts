import { DateTime } from 'luxon'
import UserSetting from '#models/user_setting'
import { createEditionBuilder } from '#services/edition/edition_builder'
import { createPreferenceLearner } from '#services/preferences/preference_learner'
import { editionMailerForUser } from '#services/email/edition_mailer'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Runs the daily pipeline on demand for the authenticated reader — the same work
 * the `newspaper:run-daily` command does — so they can rebuild today's edition
 * from the API. It runs inline and returns once the edition is ready.
 */
export default class RunDailyController {
  async store({ auth, logger, serialize }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const date = DateTime.now().toISODate()!

    const learner = await createPreferenceLearner(user)
    await learner.learn()

    const builder = await createEditionBuilder(user, logger)
    const { edition, failures } = await builder.build(date)

    const settings = await UserSetting.findBy('user_id', user.id)
    if (settings?.emailEnabled) {
      await editionMailerForUser(user).deliver(edition)
    }

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
