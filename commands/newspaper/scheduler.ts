import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'

/**
 * A long-running process that dispatches each reader's daily edition build at
 * the time they configured. Every minute it looks for readers whose run time is
 * now (and whose email frequency lands on today) and queues a build for each —
 * the worker then does the heavy lifting. Run one of these alongside the queue
 * worker; run times are interpreted in the server's timezone (the TZ variable).
 */
export default class Scheduler extends BaseCommand {
  static commandName = 'newspaper:scheduler'
  static description =
    'Continuously dispatch each reader’s daily edition build at their configured time'

  // Boot the full app (so the queue is available) and keep the process alive.
  static options: CommandOptions = { startApp: true, staysAlive: true }

  private timer?: NodeJS.Timeout
  /** The last minute we acted on, so a minute never fires twice. */
  private lastMinute = ''

  async run() {
    const { dispatchDueBuilds } = await import('#services/edition/scheduler')

    this.logger.info('Newspaper scheduler started — dispatching builds at each reader’s run time.')

    const tick = async () => {
      const now = DateTime.now()
      const minute = now.toFormat('HH:mm')
      // We check several times a minute so a tick lands soon after each HH:mm
      // boundary, but only act once per minute.
      if (minute === this.lastMinute) return
      this.lastMinute = minute

      try {
        const dispatched = await dispatchDueBuilds(now)
        for (const build of dispatched) {
          this.logger.info(`  ${build.email}: build ${build.outcome} for ${now.toISODate()}.`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.error(`Scheduler tick failed: ${message}`)
      }
    }

    this.timer = setInterval(() => void tick(), 20_000)
    await tick()

    // Stop the timer cleanly when the app is shutting down.
    this.app.terminating(() => {
      if (this.timer) clearInterval(this.timer)
    })
  }
}
