import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import Edition from '#models/edition'
import { EditionMailer } from '#services/email/edition_mailer'

/**
 * Emails an edition that has already been built, without rebuilding it. Useful
 * when a send failed (say the network was down) and the edition just needs to
 * go out again. Defaults to today; pass --date for another day.
 */
export default class SendEdition extends BaseCommand {
  static commandName = 'newspaper:send-edition'
  static description = 'Email an already-built edition without rebuilding it'

  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'The day to send, as YYYY-MM-DD (defaults to today)' })
  declare date?: string

  async run() {
    const date = this.date ?? DateTime.now().toISODate()!

    const edition = await Edition.findBy('date', date)
    if (!edition) {
      this.logger.error(`No edition found for ${date}. Build it first with newspaper:run-daily.`)
      this.exitCode = 1
      return
    }

    try {
      await new EditionMailer().deliver(edition)
      this.logger.success(`Emailed the edition for ${date}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Could not email the edition: ${message}`)
      this.exitCode = 1
    }
  }
}
