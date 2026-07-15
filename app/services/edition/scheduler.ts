import type { DateTime } from 'luxon'
import User from '#models/user'
import UserSetting from '#models/user_setting'
import { makeDailyRunDispatcher } from '#services/edition/daily_run'
import { isSendDay } from '#services/support/email_schedule'
import type { DailyRunDispatcher, DispatchOutcome } from '#services/edition/daily_run'

/** A build the scheduler kicked off in a given minute, kept for logging. */
export interface DispatchedBuild {
  userId: string
  email: string
  outcome: DispatchOutcome
}

/**
 * Dispatches a daily edition build for every active reader whose configured run
 * time is the given minute and whose email frequency lands on this day. Builds
 * go onto the queue through the dispatcher, so the heavy scouting and
 * summarising happen in the worker while the scheduler stays light. The
 * dispatcher's own per-reader guard means a reader already mid-build is left
 * alone rather than queued twice.
 */
export async function dispatchDueBuilds(
  now: DateTime,
  dispatcher: DailyRunDispatcher = makeDailyRunDispatcher()
): Promise<DispatchedBuild[]> {
  const minute = now.toFormat('HH:mm')
  const today = now.toISODate()!
  const dispatched: DispatchedBuild[] = []

  const users = await User.query().where('is_active', true)
  for (const user of users) {
    const settings = await UserSetting.findBy('user_id', user.id)
    if (!settings) continue
    if (settings.runTime !== minute) continue
    if (!isSendDay(settings.emailFrequency, today)) continue

    const outcome = await dispatcher.dispatch(user.id, today)
    dispatched.push({ userId: user.id, email: user.email, outcome })
  }

  return dispatched
}
