import { Job } from '@rlanz/bull-queue'
import { backfillYoutubeChannelIds } from '#services/scout/youtube_channel_backfill'

/** Repeatable jobs carry no payload — the backfill works off the current sources. */
type BackfillPayload = Record<string, never>

/**
 * Periodically resolves the channel id for any youtube source that still has only
 * a channel url, so sources added before url resolution existed start working on
 * their own without the reader re-adding them. Registered as a repeatable job (see
 * the scheduler:setup command); once everything is resolved it is a cheap no-op.
 */
export default class BackfillYoutubeChannelsJob extends Job {
  static get $$filepath() {
    return import.meta.url
  }

  async handle(_payload: BackfillPayload) {
    const backfilled = await backfillYoutubeChannelIds()
    if (backfilled > 0) {
      this.logger.info(`Backfilled ${backfilled} youtube channel id(s).`)
    }
  }

  /**
   * A failed run is not worth retrying — another one comes around soon. Just
   * record it so a persistent problem is visible in the logs.
   */
  async rescue(_payload: BackfillPayload, error: Error) {
    this.logger.error(`Youtube channel backfill failed: ${error.message}`)
  }
}
