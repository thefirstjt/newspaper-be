import { Job } from '@rlanz/bull-queue'
import transmit from '@adonisjs/transmit/services/main'
import User from '#models/user'
import { editionChannelFor, runDailyPipeline } from '#services/edition/daily_run'

interface BuildEditionPayload {
  userId: string
  date: string
}

/**
 * Builds a reader's edition for a day in the background — scouting, ranking and
 * summarising their picks — then announces the finished edition on the reader's
 * own Transmit channel. The frontend shows a loader after kicking this off and
 * swaps it for the edition when the completed event arrives.
 */
export default class BuildEditionJob extends Job {
  static get $$filepath() {
    return import.meta.url
  }

  async handle({ userId, date }: BuildEditionPayload) {
    const user = await User.findOrFail(userId)
    const edition = await runDailyPipeline(user, this.logger, date)

    transmit.broadcast(editionChannelFor(userId), { status: 'completed', edition })
  }

  /**
   * Called once the retries are exhausted. Let the waiting frontend know the
   * build failed rather than leaving its loader spinning forever.
   */
  async rescue({ userId }: BuildEditionPayload, error: Error) {
    transmit.broadcast(editionChannelFor(userId), {
      status: 'failed',
      error: error.message,
    })
  }
}
