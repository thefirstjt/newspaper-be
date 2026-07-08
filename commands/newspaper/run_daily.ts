import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import newspaperConfig from '#config/newspaper'
import Item from '#models/item'
import QuizQuestion from '#models/quiz_question'
import type Edition from '#models/edition'
import { createEditionBuilder } from '#services/edition/edition_builder'
import { createPreferenceLearner } from '#services/preferences/preference_learner'
import { EditionMailer } from '#services/email/edition_mailer'

/**
 * Builds the newspaper edition for a day: it scouts for stories, ranks and
 * summarises them, saves the edition, and emails it. Defaults to today; pass
 * --date to (re)build a specific day, and --no-email to skip the email. Re-
 * running a day rebuilds it from scratch.
 */
export default class RunDaily extends BaseCommand {
  static commandName = 'newspaper:run-daily'
  static description = 'Scout, rank, assemble, and email the newspaper edition for a day'

  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'The day to build, as YYYY-MM-DD (defaults to today)' })
  declare date?: string

  @flags.boolean({
    description: 'Send the edition by email (use --no-email to skip)',
    default: true,
  })
  declare email: boolean

  async run() {
    const date = this.date ?? DateTime.now().toISODate()!

    this.logger.info(`Building edition for ${date}…`)

    const learned = await createPreferenceLearner().learn()
    if (learned > 0) {
      this.logger.info(
        `Folded ${learned} piece(s) of recent feedback into the reader's preferences.`
      )
    }

    const { edition, failures } = await createEditionBuilder(this.logger).build(date)

    const items = await Item.query().where('edition_id', edition.id)
    const surfaced = items.filter((item) => item.state === 'surfaced').length
    const reserve = items.filter((item) => item.state === 'reserve').length
    const quizCount = await QuizQuestion.query().where('edition_id', edition.id).count('* as total')
    const questions = Number(quizCount[0].$extras.total)

    this.logger.success(
      `Edition ${edition.date} built — ${surfaced} surfaced, ${reserve} in reserve, ` +
        `key learning written, ${questions} quiz question(s).`
    )

    if (failures.length > 0) {
      this.logger.warning(`${failures.length} source(s) could not be read:`)
      for (const failure of failures) {
        this.logger.warning(`  ${failure.sourceName}: ${failure.message}`)
      }
    }

    await this.emailEdition(edition)
  }

  /**
   * Emails the edition unless it was disabled — by --no-email for this run, or by
   * EMAIL_ENABLED for the whole install. A failure to send is reported but does
   * not fail the run, since the edition is already built and browsable.
   */
  private async emailEdition(edition: Edition) {
    if (!this.email) {
      this.logger.info('Skipping email (--no-email).')
      return
    }
    if (!newspaperConfig.schedule.emailEnabled) {
      this.logger.info('Skipping email (EMAIL_ENABLED is off).')
      return
    }

    try {
      await new EditionMailer().deliver(edition)
      this.logger.success('Emailed the edition to the reader.')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warning(`Could not email the edition: ${message}`)
    }
  }
}
