import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { getContextStore } from '#services/context/context_store_manager'

/**
 * Creates the live reader-context documents from the shipped templates, so the
 * reader can start editing them. Documents that already exist are left
 * untouched, making this safe to run more than once.
 */
export default class SeedContext extends BaseCommand {
  static commandName = 'newspaper:seed-context'
  static description = 'Create the live reader-context documents from the shipped templates'

  static options: CommandOptions = { startApp: true }

  async run() {
    const { seeded, existing } = await getContextStore().seed()
    this.logger.success(
      `Reader context seeded — ${seeded.length} created, ${existing.length} already present.`
    )
  }
}
