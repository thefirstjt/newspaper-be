import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import {
  editionChannelFor,
  setDailyRunDispatcher,
  resetDailyRunDispatcher,
} from '#services/edition/daily_run'

let counter = 0
async function reader() {
  counter += 1
  return User.create({
    name: 'Reader',
    email: `reader-${counter}@example.com`,
    password: 'secret123',
  })
}

test.group('Run daily', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  // Swap the real (Redis-backed) dispatcher for one that just records calls, so
  // the endpoint can be tested without a queue running.
  let dispatched: { userId: string; date: string }[] = []
  group.each.setup(() => {
    dispatched = []
    setDailyRunDispatcher(() => ({
      async dispatch(userId, date) {
        dispatched.push({ userId, date })
      },
    }))
  })
  group.teardown(() => resetDailyRunDispatcher())

  test('queues today’s edition build and returns the reader’s channel', async ({
    client,
    assert,
  }) => {
    const user = await reader()

    const response = await client.post('/api/v1/run-daily').loginAs(user)

    response.assertStatus(202)
    assert.equal(response.body().data.channel, editionChannelFor(user.id))

    assert.lengthOf(dispatched, 1)
    assert.equal(dispatched[0].userId, user.id)
    assert.equal(dispatched[0].date, DateTime.now().toISODate())
  })

  test('rebuilds a specific date when one is given', async ({ client, assert }) => {
    const user = await reader()

    const response = await client
      .post('/api/v1/run-daily')
      .json({ date: '2026-07-01' })
      .loginAs(user)

    response.assertStatus(202)
    assert.equal(response.body().data.channel, editionChannelFor(user.id))
    assert.lengthOf(dispatched, 1)
    assert.equal(dispatched[0].date, '2026-07-01')
  })

  test('rejects an invalid date', async ({ client, assert }) => {
    const user = await reader()
    const response = await client
      .post('/api/v1/run-daily')
      .json({ date: 'not-a-date' })
      .loginAs(user)
    response.assertStatus(422)
    assert.lengthOf(dispatched, 0)
  })

  test('requires authentication', async ({ client, assert }) => {
    const response = await client.post('/api/v1/run-daily')
    response.assertStatus(401)
    assert.lengthOf(dispatched, 0)
  })
})
