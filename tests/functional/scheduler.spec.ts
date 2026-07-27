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
  timezone?: string
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
    timezone: settings.timezone ?? 'UTC',
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

  // A Monday, so weekly readers are on their send day; day 13, so monthly are
  // not. Pinned to UTC so timezone conversions in the tests are deterministic.
  const now = DateTime.fromISO('2026-07-13T09:00:00', { zone: 'utc' })

  test('dispatches only readers whose run hour is the current hour', async ({ assert }) => {
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

  test('still dispatches when the hourly tick runs late within the hour', async ({ assert }) => {
    const due = await readerWithSettings({ runTime: '09:00' })
    const dispatcher = recordingDispatcher()

    // The tick fired at 09:00 but ran at 09:45 — the reader is still due.
    const dispatched = await dispatchDueBuilds(
      DateTime.fromISO('2026-07-13T09:45:00', { zone: 'utc' }),
      dispatcher
    )

    assert.lengthOf(dispatched, 1)
    assert.equal(dispatched[0].userId, due.id)
  })

  test("matches a reader's run hour in their own timezone", async ({ assert }) => {
    // Lagos is UTC+1, so their 09:00 arrives when it is 08:00 UTC.
    const lagos = await readerWithSettings({ runTime: '09:00', timezone: 'Africa/Lagos' })
    const dispatcher = recordingDispatcher()

    const early = await dispatchDueBuilds(
      DateTime.fromISO('2026-07-13T08:00:00', { zone: 'utc' }),
      dispatcher
    )
    assert.lengthOf(early, 1)
    assert.equal(early[0].userId, lagos.id)

    // At 09:00 UTC it is already 10:00 in Lagos, so they are no longer due.
    const later = await dispatchDueBuilds(
      DateTime.fromISO('2026-07-13T09:00:00', { zone: 'utc' }),
      recordingDispatcher()
    )
    assert.lengthOf(later, 0)
  })

  test('dates the build to the reader’s local day, not the server’s', async ({ assert }) => {
    // Kiritimati is UTC+14: at 10:00 UTC on the 13th it is already 00:00 on the
    // 14th there, so a midnight reader is due and their edition is dated the 14th.
    const reader = await readerWithSettings({ runTime: '00:00', timezone: 'Pacific/Kiritimati' })
    const dispatcher = recordingDispatcher()

    const dispatched = await dispatchDueBuilds(
      DateTime.fromISO('2026-07-13T10:00:00', { zone: 'utc' }),
      dispatcher
    )

    assert.lengthOf(dispatched, 1)
    assert.equal(dispatcher.calls[0].userId, reader.id)
    assert.equal(dispatcher.calls[0].date, '2026-07-14')
  })

  test('skips deactivated readers even when their run hour matches', async ({ assert }) => {
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
