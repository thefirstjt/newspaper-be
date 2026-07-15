import { Job } from '@rlanz/bull-queue'
import { DateTime } from 'luxon'
import { dispatchDueBuilds } from '#services/edition/scheduler'

/** Repeatable jobs carry no payload — the tick works off the current time. */
type TickPayload = Record<string, never>

/**
 * The scheduler tick. Registered as a repeatable job that fires every hour on
 * the dedicated 'scheduler' queue, it queues a daily edition build for every
 * reader whose configured run hour is now (and whose email frequency lands on
 * today). The builds themselves go onto the 'default' queue, so this stays a
 * quick query-and-dispatch that never competes with a running build.
 */
export default class DispatchDueBuildsJob extends Job {
  static get $$filepath() {
    return import.meta.url
  }

  async handle(_payload: TickPayload) {
    const now = DateTime.now()
    const dispatched = await dispatchDueBuilds(now)
    for (const build of dispatched) {
      this.logger.info(`Scheduler: build ${build.outcome} for ${build.email} (${now.toISODate()}).`)
    }
  }

  /**
   * A failed tick is not worth retrying — another one fires a minute later. Just
   * record it so a persistent problem is visible in the logs.
   */
  async rescue(_payload: TickPayload, error: Error) {
    this.logger.error(`Scheduler tick failed: ${error.message}`)
  }
}
