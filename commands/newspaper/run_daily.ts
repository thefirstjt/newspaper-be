import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import User from '#models/user'
import Item from '#models/item'
import QuizQuestion from '#models/quiz_question'
import UserSetting from '#models/user_setting'
import type Edition from '#models/edition'
import { createEditionBuilder } from '#services/edition/edition_builder'
import { createPreferenceLearner } from '#services/preferences/preference_learner'
import { editionMailerForUser } from '#services/email/edition_mailer'
import { resolveUser } from '#services/support/resolve_user'
import { isSendDay } from '#services/support/email_schedule'

/**
 * Builds and emails each active reader's edition for a day: it scouts their
 * sources, ranks and summarises the picks, saves the edition, and emails it.
 * Runs for every active user by default, skipping those whose email frequency
 * does not fall on this day; pass --user to run for one reader regardless.
 * Defaults to today; pass --date to (re)build a specific day, and --no-email to
 * skip email.
 */
export default class RunDaily extends BaseCommand {
  static commandName = 'newspaper:run-daily'
  static description = 'Scout, rank, assemble, and email each reader’s edition for a day'

  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'The day to build, as YYYY-MM-DD (defaults to today)' })
  declare date?: string

  @flags.string({ description: 'Run for one reader only, by email (defaults to all active users)' })
  declare user?: string

  @flags.boolean({
    description: 'Send the edition by email (use --no-email to skip)',
    default: true,
  })
  declare email: boolean

  async run() {
    const date = this.date ?? DateTime.now().toISODate()!
    const users = this.user
      ? [await resolveUser(this.user)]
      : await User.query().where('is_active', true)

    if (users.length === 0) {
      this.logger.info('No active users to build editions for.')
      return
    }

    for (const user of users) {
      // On the automated all-users run, only build for readers whose email
      // frequency lands on this day. An explicit --user always runs.
      if (!this.user) {
        const settings = await UserSetting.findBy('user_id', user.id)
        const frequency = settings?.emailFrequency ?? 'daily'
        if (!isSendDay(frequency, date)) {
          this.logger.info(`Skipping ${user.email} — not their ${frequency} send day.`)
          continue
        }
      }

      this.logger.info(`Building edition for ${user.email} (${date})…`)
      await this.runForUser(user, date)
    }
  }

  private async runForUser(user: User, date: string) {
    const learner = await createPreferenceLearner(user)
    const learned = await learner.learn()
    if (learned > 0) {
      this.logger.info(`  Folded ${learned} piece(s) of recent feedback into their preferences.`)
    }

    const builder = await createEditionBuilder(user, this.logger)
    const { edition, failures } = await builder.build(date)

    const items = await Item.query().where('edition_id', edition.id)
    const surfaced = items.filter((item) => item.state === 'surfaced').length
    const reserve = items.filter((item) => item.state === 'reserve').length
    const quizCount = await QuizQuestion.query().where('edition_id', edition.id).count('* as total')
    const questions = Number(quizCount[0].$extras.total)

    this.logger.success(
      `  Edition ${edition.date} built — ${surfaced} surfaced, ${reserve} in reserve, ` +
        `key learning written, ${questions} quiz question(s).`
    )

    if (failures.length > 0) {
      this.logger.warning(`  ${failures.length} source(s) could not be read:`)
      for (const failure of failures) {
        this.logger.warning(`    ${failure.sourceName}: ${failure.message}`)
      }
    }

    await this.emailEdition(user, edition)
  }

  /**
   * Emails the reader's edition unless it was disabled — by --no-email for this
   * run, or by the reader's own email setting. A failure to send is reported but
   * does not fail the run, since the edition is already built and browsable.
   */
  private async emailEdition(user: User, edition: Edition) {
    if (!this.email) {
      this.logger.info('  Skipping email (--no-email).')
      return
    }

    const settings = await UserSetting.findBy('user_id', user.id)
    if (!settings?.emailEnabled) {
      this.logger.info('  Skipping email (disabled for this reader).')
      return
    }

    try {
      await editionMailerForUser(user).deliver(edition)
      this.logger.success('  Emailed the edition to the reader.')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warning(`  Could not email the edition: ${message}`)
    }
  }
}
