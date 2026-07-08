import db from '@adonisjs/lucid/services/db'
import GapTopic from '#models/gap_topic'
import UserSetting from '#models/user_setting'
import { scheduleValidator, gapTopicsValidator } from '#validators/config'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Per-user schedule and learning-gap settings. Categories and sources have their
 * own controllers; this one handles the reader's schedule (run time, email
 * toggle and frequency) and their learning-gap topics.
 */
export default class ConfigController {
  /** When the reader's pipeline runs and how their edition is emailed. */
  async showSchedule({ auth, serialize }: HttpContext) {
    const settings = await this.settingsFor(auth.use('api').getUserOrFail().id)
    return serialize(presentSchedule(settings))
  }

  /** Updates the reader's schedule and email settings. */
  async updateSchedule({ auth, request, serialize }: HttpContext) {
    const settings = await this.settingsFor(auth.use('api').getUserOrFail().id)
    const changes = await request.validateUsing(scheduleValidator)

    settings.merge({
      runTime: changes.runTime ?? settings.runTime,
      emailEnabled: changes.emailEnabled ?? settings.emailEnabled,
      emailFrequency: changes.emailFrequency ?? settings.emailFrequency,
    })
    await settings.save()

    return serialize(presentSchedule(settings))
  }

  /** The reader's learning-gap topics, in order. */
  async gapTopics({ auth, serialize }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const topics = await GapTopic.query().where('user_id', user.id).orderBy('position')
    return serialize({ topics: topics.map((topic) => topic.topic) })
  }

  /** Replaces the reader's learning-gap topics with the given list. */
  async updateGapTopics({ auth, request, serialize }: HttpContext) {
    const user = auth.use('api').getUserOrFail()
    const { topics } = await request.validateUsing(gapTopicsValidator)

    await db.transaction(async (trx) => {
      await GapTopic.query({ client: trx }).where('user_id', user.id).delete()
      for (const [position, topic] of topics.entries()) {
        await GapTopic.create({ userId: user.id, topic, position }, { client: trx })
      }
    })

    return serialize({ topics })
  }

  private async settingsFor(userId: string): Promise<UserSetting> {
    return UserSetting.findByOrFail('user_id', userId)
  }
}

function presentSchedule(settings: UserSetting) {
  return {
    runTime: settings.runTime,
    emailEnabled: settings.emailEnabled,
    emailFrequency: settings.emailFrequency,
  }
}
