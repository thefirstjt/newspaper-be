import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import UserSetting from '#models/user_setting'
import { dispatchDueBuilds } from '#services/edition/scheduler'
import type { DailyRunDispatcher, DispatchOutcome } from '#services/edition/daily_run'

let counter = 0
async function readerWithSettings(settings: {
  runTime: string
  emailFrequency?: string
  isActive?: boolean
}) {
  counter += 1
  const user = await User.create({
    name: 'Reader',
    email: `reader-${counter}@example.com`,
    password: 'secret123',
    isActive: settings.isActive ?? true,
  })
  await UserSetting.create({
    userId: user.id,
    quizMin: 1,
    quizMax: 3,
    runTime: settings.runTime,
    emailEnabled: true,
    emailFrequency: settings.emailFrequency ?? 'daily',
  })
  return user
}

/** A dispatcher that records the builds it was asked to queue. */
function recordingDispatcher(): DailyRunDispatcher & { calls: { userId: string; date: string }[] } {
  const calls: { userId: string; date: string }[] = []
  return {
    calls,
    async dispatch(userId, date): Promise<DispatchOutcome> {
      calls.push({ userId, date })
      return 'queued'
    },
  }
}

test.group('Scheduler', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  // A Monday, so weekly readers are on their send day; day 15, so monthly are not.
  const now = DateTime.fromISO('2026-07-13T09:00:00')

  test('dispatches only readers whose run time is the current minute', async ({ assert }) => {
    const due = await readerWithSettings({ runTime: '09:00' })
    await readerWithSettings({ runTime: '21:00' })
    const dispatcher = recordingDispatcher()

    const dispatched = await dispatchDueBuilds(now, dispatcher)

    assert.lengthOf(dispatcher.calls, 1)
    assert.equal(dispatcher.calls[0].userId, due.id)
    assert.equal(dispatcher.calls[0].date, '2026-07-13')
    assert.lengthOf(dispatched, 1)
    assert.equal(dispatched[0].outcome, 'queued')
  })

  test('skips deactivated readers even when their run time matches', async ({ assert }) => {
    await readerWithSettings({ runTime: '09:00', isActive: false })
    const dispatcher = recordingDispatcher()

    const dispatched = await dispatchDueBuilds(now, dispatcher)

    assert.lengthOf(dispatched, 0)
    assert.lengthOf(dispatcher.calls, 0)
  })

  test('a weekly reader is dispatched on their send day', async ({ assert }) => {
    const weekly = await readerWithSettings({ runTime: '09:00', emailFrequency: 'weekly' })
    const dispatcher = recordingDispatcher()

    const dispatched = await dispatchDueBuilds(now, dispatcher)

    assert.lengthOf(dispatched, 1)
    assert.equal(dispatched[0].userId, weekly.id)
  })

  test('a monthly reader is skipped when today is not the first of the month', async ({
    assert,
  }) => {
    await readerWithSettings({ runTime: '09:00', emailFrequency: 'monthly' })
    const dispatcher = recordingDispatcher()

    const dispatched = await dispatchDueBuilds(now, dispatcher)

    assert.lengthOf(dispatched, 0)
  })
})
