import User from '#models/user'
import UserSetting from '#models/user_setting'
import { createEditionBuilder } from '#services/edition/edition_builder'
import { createPreferenceLearner } from '#services/preferences/preference_learner'
import { editionMailerForUser } from '#services/email/edition_mailer'
import type { EditionLogger } from '#services/edition/edition_builder'

/** The Transmit channel a reader's edition builds are announced on. */
export function editionChannelFor(userId: string): string {
  return `users/${userId}/editions`
}

/**
 * A finished edition build, in the shape the endpoint used to return inline. A
 * `type` (not an `interface`) so it carries an implicit index signature and can
 * be handed straight to `transmit.broadcast`.
 */
export type DailyRunResult = {
  date: string
  status: string
  failures: { source: string; message: string }[]
}

/**
 * The daily pipeline for one reader, independent of how it is triggered: fold
 * their recent feedback into their preferences, build the day's edition, and
 * email it if they have email enabled. This is slow — scouting, ranking and
 * summarising with the models — so it runs inside a queued job rather than
 * blocking the request.
 */
export async function runDailyPipeline(
  user: User,
  logger: EditionLogger,
  date: string
): Promise<DailyRunResult> {
  const learner = await createPreferenceLearner(user)
  await learner.learn()

  const builder = await createEditionBuilder(user, logger)
  const { edition, failures } = await builder.build(date)

  const settings = await UserSetting.findBy('user_id', user.id)
  if (settings?.emailEnabled) {
    await editionMailerForUser(user).deliver(edition)
  }

  return {
    date: edition.date,
    status: edition.status,
    failures: failures.map((failure) => ({
      source: failure.sourceName,
      message: failure.message,
    })),
  }
}

/**
 * How the endpoint hands the daily build off to run in the background. Behind a
 * swappable factory so the endpoint can be exercised in tests without a real
 * queue (and therefore without Redis).
 */
export interface DailyRunDispatcher {
  dispatch(userId: string, date: string): Promise<void>
}

/** The real dispatch: enqueue the job onto the Redis-backed queue. */
class QueuedDailyRun implements DailyRunDispatcher {
  async dispatch(userId: string, date: string): Promise<void> {
    const { default: queue } = await import('@rlanz/bull-queue/services/main')
    const { default: BuildEditionJob } = await import('#jobs/build_edition_job')
    await queue.dispatch(BuildEditionJob, { userId, date })
  }
}

let factory: () => DailyRunDispatcher = () => new QueuedDailyRun()

export function makeDailyRunDispatcher(): DailyRunDispatcher {
  return factory()
}

export function setDailyRunDispatcher(next: () => DailyRunDispatcher): void {
  factory = next
}

export function resetDailyRunDispatcher(): void {
  factory = () => new QueuedDailyRun()
}
