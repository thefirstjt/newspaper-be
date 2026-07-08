import newspaperConfig from '#config/newspaper'
import Source from '#models/source'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Read-only views of how the newspaper is set up. The configuration itself
 * lives in `config/newspaper.ts` and env, and is changed by editing those and
 * restarting (a single-user, self-hosted tool), so these endpoints report the
 * current setup rather than editing it.
 */
export default class ConfigController {
  /** The sources the newspaper reads, from the reconciled `sources` table. */
  async sources({ serialize }: HttpContext) {
    const sources = await Source.all()
    return serialize({
      sources: sources.map((source) => ({
        id: source.id,
        categoryKey: source.categoryKey,
        type: source.type,
        name: source.name,
        settings: source.settings,
        enabled: source.enabled,
        lastFetchedAt: source.lastFetchedAt?.toISO() ?? null,
      })),
    })
  }

  /** The newspaper's categories and how many items each surfaces per day. */
  async categories({ serialize }: HttpContext) {
    return serialize({
      categories: newspaperConfig.categories.map((category) => ({
        key: category.key,
        title: category.title,
        min: category.min,
        max: category.max,
        poolSize: category.poolSize,
        relevanceHint: category.relevanceHint,
      })),
    })
  }

  /** When the daily pipeline runs and whether the edition is emailed. */
  async schedule({ serialize }: HttpContext) {
    return serialize({
      runTime: newspaperConfig.schedule.runTime,
      emailEnabled: newspaperConfig.schedule.emailEnabled,
    })
  }
}
