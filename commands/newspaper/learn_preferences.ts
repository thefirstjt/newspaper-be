import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { createPreferenceLearner } from '#services/preferences/preference_learner'
import { resolveUser } from '#services/support/resolve_user'

/**
 * Folds a reader's recent ratings and discards into their preferences document,
 * so future editions reflect what they have responded to. Defaults to the sole
 * active user; pass --user to pick another.
 */
export default class LearnPreferences extends BaseCommand {
  static commandName = 'newspaper:learn-preferences'
  static description = "Update a reader's preferences from their recent ratings and discards"

  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'The reader, by email (defaults to the sole active user)' })
  declare user?: string

  async run() {
    const user = await resolveUser(this.user)
    const learner = await createPreferenceLearner(user)
    const applied = await learner.learn()

    if (applied === 0) {
      this.logger.info('No new feedback to learn from.')
    } else {
      this.logger.success(`Folded ${applied} signal(s) into the reader's preferences.`)
    }
  }
}
