import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import newspaperConfig from '#config/newspaper'
import Source from '#models/source'

/**
 * Brings the `sources` table in line with the categories defined in
 * config/newspaper.ts. Sources in the config are created or updated, and any
 * source no longer in the config is removed, so the table always mirrors what
 * the newspaper is configured to read. Runtime state such as the last fetch
 * time is preserved for sources that survive the sync.
 */
export default class ReconcileSources extends BaseCommand {
  static commandName = 'newspaper:reconcile-sources'
  static description = 'Sync the sources table with the categories in config/newspaper.ts'

  static options: CommandOptions = { startApp: true }

  async run() {
    const configuredSources = newspaperConfig.categories.flatMap((category) =>
      category.sources.map((source) => ({ ...source, categoryKey: category.key }))
    )

    let added = 0
    let updated = 0

    for (const source of configuredSources) {
      const existing = await Source.query()
        .where('category_key', source.categoryKey)
        .where('name', source.name)
        .first()

      if (existing) {
        existing.type = source.type
        existing.settings = source.settings
        await existing.save()
        updated++
      } else {
        await Source.create({
          categoryKey: source.categoryKey,
          name: source.name,
          type: source.type,
          settings: source.settings,
          enabled: true,
        })
        added++
      }
    }

    const configuredIdentifiers = new Set(
      configuredSources.map((source) => `${source.categoryKey}::${source.name}`)
    )

    let removed = 0
    for (const source of await Source.all()) {
      if (!configuredIdentifiers.has(`${source.categoryKey}::${source.name}`)) {
        await source.delete()
        removed++
      }
    }

    this.logger.success(
      `Sources reconciled — ${added} added, ${updated} updated, ${removed} removed.`
    )
  }
}
