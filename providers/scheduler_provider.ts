import type { ApplicationService } from '@adonisjs/core/types'

/**
 * Installs the newspaper's scheduler tick as a BullMQ repeatable job, so the
 * queue itself fires it every hour — no bespoke always-on loop needed.
 *
 * Registration runs only in the queue worker (`node ace queue:listen`): that is
 * the process that has Redis and actually drains the schedule, so installing it
 * anywhere else (the web server, one-off ace commands, tests) would just add a
 * needless Redis connection. BullMQ keys the schedule by its repeat pattern, so
 * a restart — or a second worker — re-registers the same one rather than piling
 * up duplicates.
 */
export default class SchedulerProvider {
  constructor(protected app: ApplicationService) {}

  async ready() {
    // We only want to register the tick inside the queue worker. The command is
    // read from process.argv, which bin/console.ts deliberately leaves intact
    // (it slices rather than splices) so the command name is still here by the
    // time this ready hook runs.
    const isQueueWorker =
      this.app.getEnvironment() === 'console' && process.argv.includes('queue:listen')
    if (!isQueueWorker) return

    const { default: queue } = await import('@rlanz/bull-queue/services/main')
    const { default: DispatchDueBuildsJob } = await import('#jobs/dispatch_due_builds_job')

    await queue.dispatch(
      DispatchDueBuildsJob,
      {},
      {
        queueName: 'scheduler',
        // Every hour, on the hour. The tick then picks the readers due that hour.
        repeat: { pattern: '0 * * * *' },
        removeOnComplete: true,
        removeOnFail: true,
      }
    )
  }
}
