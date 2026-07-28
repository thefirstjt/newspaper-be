import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Registers the newspaper's recurring jobs as BullMQ repeatable jobs, so the
 * queue itself fires them on a schedule — no bespoke always-on loop needed:
 *   - the scheduler tick, hourly, which queues a daily edition build for every
 *     reader whose run hour has arrived;
 *   - the youtube channel backfill, every half hour, which resolves the channel
 *     id for any youtube source still carrying only a channel url.
 *
 * This is meant to run once before the queue worker starts draining, e.g.
 * `node ace scheduler:setup && node ace queue:listen`. Running it again is
 * harmless: BullMQ keys a schedule by its repeat pattern, so re-running (on a
 * restart or redeploy) re-registers the same one rather than piling up duplicates.
 */
export default class SchedulerSetup extends BaseCommand {
  static commandName = 'scheduler:setup'
  static description = 'Register the recurring queue jobs (scheduler tick, youtube backfill)'

  static options: CommandOptions = { startApp: true }

  async run() {
    const { default: queue } = await import('@rlanz/bull-queue/services/main')
    const { default: DispatchDueBuildsJob } = await import('#jobs/dispatch_due_builds_job')
    const { default: BackfillYoutubeChannelsJob } =
      await import('#jobs/backfill_youtube_channels_job')

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

    await queue.dispatch(
      BackfillYoutubeChannelsJob,
      {},
      {
        queueName: 'scheduler',
        // Every half hour. Once every youtube source has an id it is a no-op.
        repeat: { pattern: '*/30 * * * *' },
        removeOnComplete: true,
        removeOnFail: true,
      }
    )

    this.logger.success('Recurring jobs registered on the "scheduler" queue.')
  }
}
