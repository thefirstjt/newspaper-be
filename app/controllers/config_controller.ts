import db from '@adonisjs/lucid/services/db'
import Source from '#models/source'
import Category from '#models/category'
import GapTopic from '#models/gap_topic'
import UserSetting from '#models/user_setting'
import { scheduleValidator, gapTopicsValidator } from '#validators/config'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Per-user views and edits of how a reader's newspaper is set up. Categories,
 * sources, the schedule and the learning-gap topics all live in the database now
 * and are scoped to the authenticated reader.
 */
export default class ConfigController {
  /** The reader's sources. */
  async sources({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const sources = await Source.query().where('user_id', user.id).orderBy('category_id')
    return serialize({
      sources: sources.map((source) => ({
        id: source.id,
        categoryId: source.categoryId,
        type: source.type,
        name: source.name,
        settings: source.settings,
        enabled: source.enabled,
        lastFetchedAt: source.lastFetchedAt?.toISO() ?? null,
      })),
    })
  }

  /** The reader's categories, each with its sources. */
  async categories({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const categories = await Category.query()
      .where('user_id', user.id)
      .preload('sources')
      .orderBy('key')
    return serialize({
      categories: categories.map((category) => ({
        id: category.id,
        key: category.key,
        title: category.title,
        min: category.min,
        max: category.max,
        poolSize: category.poolSize,
        relevanceHint: category.relevanceHint,
        sources: category.sources.map((source) => ({
          id: source.id,
          type: source.type,
          name: source.name,
          settings: source.settings,
          enabled: source.enabled,
        })),
      })),
    })
  }

  /** When the reader's pipeline runs and how their edition is emailed. */
  async showSchedule({ auth, serialize }: HttpContext) {
    const settings = await this.settingsFor(auth.getUserOrFail().id)
    return serialize(presentSchedule(settings))
  }

  /** Updates the reader's schedule and email settings. */
  async updateSchedule({ auth, request, serialize }: HttpContext) {
    const settings = await this.settingsFor(auth.getUserOrFail().id)
    const changes = await request.validateUsing(scheduleValidator)

    settings.merge({
      runTime: changes.runTime ?? settings.runTime,
      emailEnabled: changes.emailEnabled ?? settings.emailEnabled,
      emailRecipient:
        changes.emailRecipient === undefined ? settings.emailRecipient : changes.emailRecipient,
      emailRecipientName:
        changes.emailRecipientName === undefined
          ? settings.emailRecipientName
          : changes.emailRecipientName,
    })
    await settings.save()

    return serialize(presentSchedule(settings))
  }

  /** The reader's learning-gap topics, in order. */
  async gapTopics({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const topics = await GapTopic.query().where('user_id', user.id).orderBy('position')
    return serialize({ topics: topics.map((topic) => topic.topic) })
  }

  /** Replaces the reader's learning-gap topics with the given list. */
  async updateGapTopics({ auth, request, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
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
    emailRecipient: settings.emailRecipient,
    emailRecipientName: settings.emailRecipientName,
  }
}
