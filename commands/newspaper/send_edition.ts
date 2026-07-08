import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'
import Edition from '#models/edition'
import UserSetting from '#models/user_setting'
import { editionMailerForSettings } from '#services/email/edition_mailer'
import { resolveUser } from '#services/support/resolve_user'

/**
 * Emails a reader's already-built edition, without rebuilding it. Useful when a
 * send failed (say the network was down) and the edition just needs to go out
 * again. Defaults to today and the sole active user; pass --date and --user to
 * pick another.
 */
export default class SendEdition extends BaseCommand {
  static commandName = 'newspaper:send-edition'
  static description = 'Email an already-built edition without rebuilding it'

  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'The day to send, as YYYY-MM-DD (defaults to today)' })
  declare date?: string

  @flags.string({
    description: 'The reader to send to, by email (defaults to the sole active user)',
  })
  declare user?: string

  async run() {
    const date = this.date ?? DateTime.now().toISODate()!
    const user = await resolveUser(this.user)

    const edition = await Edition.query().where('user_id', user.id).where('date', date).first()
    if (!edition) {
      this.logger.error(
        `No edition found for ${user.email} on ${date}. Build it first with newspaper:run-daily.`
      )
      this.exitCode = 1
      return
    }

    try {
      const settings = await UserSetting.findByOrFail('user_id', user.id)
      await editionMailerForSettings(settings).deliver(edition)
      this.logger.success(`Emailed the edition for ${user.email} on ${date}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Could not email the edition: ${message}`)
      this.exitCode = 1
    }
  }
}
