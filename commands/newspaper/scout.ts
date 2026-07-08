import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { createScout } from '#services/scout/scout'
import { loadCategories } from '#services/edition/edition_builder'
import { resolveUser } from '#services/support/resolve_user'

/**
 * Runs a scout across a reader's configured sources and prints what it found,
 * grouped by category, along with any sources that could not be read. Nothing is
 * saved; this is for checking that the sources are working. Defaults to the sole
 * active user; pass --user to pick another.
 */
export default class ScoutCommand extends BaseCommand {
  static commandName = 'newspaper:scout'
  static description = 'Scout a reader’s sources for candidate stories and print a summary'

  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'The reader, by email (defaults to the sole active user)' })
  declare user?: string

  async run() {
    const user = await resolveUser(this.user)
    const categories = await loadCategories(user.id)
    const { candidates, failures } = await createScout(user.id).scout(categories)

    const countsByCategory = new Map<string, number>()
    for (const candidate of candidates) {
      countsByCategory.set(
        candidate.categoryKey,
        (countsByCategory.get(candidate.categoryKey) ?? 0) + 1
      )
    }

    this.logger.info(
      `Found ${candidates.length} candidate(s) across ${countsByCategory.size} category(ies):`
    )
    for (const [category, count] of countsByCategory) {
      this.logger.info(`  ${category}: ${count}`)
    }

    if (failures.length > 0) {
      this.logger.warning(`${failures.length} source(s) could not be read:`)
      for (const failure of failures) {
        this.logger.warning(`  ${failure.sourceName}: ${failure.message}`)
      }
    }
  }
}
