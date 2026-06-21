import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { createPreferenceLearner } from '#services/preferences/preference_learner'

/**
 * Folds the reader's recent ratings and discards into their preferences
 * document, so future editions reflect what they have responded to.
 */
export default class LearnPreferences extends BaseCommand {
  static commandName = 'newspaper:learn-preferences'
  static description = "Update the reader's preferences from their recent ratings and discards"

  static options: CommandOptions = { startApp: true }

  async run() {
    const applied = await createPreferenceLearner().learn()

    if (applied === 0) {
      this.logger.info('No new feedback to learn from.')
    } else {
      this.logger.success(`Folded ${applied} signal(s) into the reader's preferences.`)
    }
  }
}
