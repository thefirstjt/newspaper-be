import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { createScout } from '#services/scout/scout'

/**
 * Runs a scout across all configured sources and prints what it found, grouped
 * by category, along with any sources that could not be read. Nothing is saved;
 * this is for checking that the sources are working.
 */
export default class ScoutCommand extends BaseCommand {
  static commandName = 'newspaper:scout'
  static description = 'Scout configured sources for candidate stories and print a summary'

  static options: CommandOptions = { startApp: true }

  async run() {
    const { candidates, failures } = await createScout().scout()

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
