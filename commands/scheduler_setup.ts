import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Registers the newspaper's scheduler tick as a BullMQ repeatable job, so the
 * queue itself fires it every hour — no bespoke always-on loop needed. The tick
 * then queues a daily edition build for every reader whose run hour has arrived.
 *
 * This is meant to run once before the queue worker starts draining, e.g.
 * `node ace scheduler:setup && node ace queue:listen`. Running it again is
 * harmless: BullMQ keys the schedule by its repeat pattern, so re-running (on a
 * restart or redeploy) re-registers the same one rather than piling up duplicates.
 */
export default class SchedulerSetup extends BaseCommand {
  static commandName = 'scheduler:setup'
  static description = 'Register the hourly scheduler tick as a repeatable queue job'

  static options: CommandOptions = { startApp: true }

  async run() {
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

    this.logger.success('Scheduler tick registered — it fires hourly on the "scheduler" queue.')
  }
}
