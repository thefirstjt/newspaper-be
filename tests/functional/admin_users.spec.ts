import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Admin from '#models/admin'
import User from '#models/user'
import Edition from '#models/edition'
import {
  setEmailSenderFactory,
  resetEmailSenderFactory,
  type EmailMessage,
} from '#services/email/email_sender'
import {
  editionChannelFor,
  setDailyRunDispatcher,
  resetDailyRunDispatcher,
  type DispatchOutcome,
} from '#services/edition/daily_run'

/** Captures sent emails instead of delivering them. */
const sent: EmailMessage[] = []

let counter = 0
async function reader(overrides: Partial<{ isActive: boolean }> = {}) {
  counter += 1
  return User.create({
    name: 'Reader',
    email: `reader-${counter}@example.com`,
    password: 'secret123',
    isActive: overrides.isActive ?? true,
  })
}

async function adminToken(client: import('@japa/api-client').ApiClient) {
  await Admin.create({ username: 'root', password: 'supersecret' })
  const login = await client
    .post('/api/v1/admin/login')
    .json({ username: 'root', password: 'supersecret' })
  return login.body().data.token as string
}

test.group('Admin users', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
    setEmailSenderFactory(() => ({
      async send(message) {
        sent.push(message)
      },
    }))
    return () => resetEmailSenderFactory()
  })
  // Swap the real (Redis-backed) build dispatcher for one that records calls.
  let dispatched: { userId: string; date: string }[] = []
  group.each.setup(() => {
    sent.length = 0
    dispatched = []
    setDailyRunDispatcher(() => ({
      async dispatch(userId, date): Promise<DispatchOutcome> {
        dispatched.push({ userId, date })
        return 'queued'
      },
    }))
    return testUtils.db().truncate()
  })
  group.teardown(() => resetDailyRunDispatcher())

  test('an admin lists the readers', async ({ client, assert }) => {
    await reader()
    await reader()
    const token = await adminToken(client)

    const response = await client
      .get('/api/v1/admin/users')
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)
    assert.lengthOf(response.body().data.users, 2)
    assert.properties(response.body().data.users[0], ['id', 'name', 'email', 'isActive'])
  })

  test('toggling status deactivates then reactivates a reader', async ({ client, assert }) => {
    const user = await reader()
    const token = await adminToken(client)

    const off = await client
      .post(`/api/v1/admin/users/${user.id}/toggle-status`)
      .header('Authorization', `Bearer ${token}`)
    off.assertStatus(200)
    assert.isFalse(off.body().data.isActive)

    const on = await client
      .post(`/api/v1/admin/users/${user.id}/toggle-status`)
      .header('Authorization', `Bearer ${token}`)
    on.assertStatus(200)
    assert.isTrue(on.body().data.isActive)
  })

  test('a deactivated reader cannot log in', async ({ client }) => {
    const user = await reader({ isActive: false })

    const login = await client
      .post('/api/v1/auth/login')
      .json({ email: user.email, password: 'secret123' })
    login.assertStatus(403)
  })

  test('deactivating a reader revokes their active sessions', async ({ client }) => {
    const user = await reader()
    const token = await adminToken(client)

    // The reader logs in and their token works.
    const login = await client
      .post('/api/v1/auth/login')
      .json({ email: user.email, password: 'secret123' })
    const readerToken = login.body().data.token
    const before = await client
      .get('/api/v1/account/profile')
      .header('Authorization', `Bearer ${readerToken}`)
    before.assertStatus(200)

    // Admin deactivates them.
    await client
      .post(`/api/v1/admin/users/${user.id}/toggle-status`)
      .header('Authorization', `Bearer ${token}`)

    // The old token no longer works.
    const after = await client
      .get('/api/v1/account/profile')
      .header('Authorization', `Bearer ${readerToken}`)
    after.assertStatus(401)
  })

  test('toggling an unknown user returns 404', async ({ client }) => {
    const token = await adminToken(client)
    const response = await client
      .post('/api/v1/admin/users/does-not-exist/toggle-status')
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(404)
  })

  test('a non-admin cannot list or toggle users', async ({ client }) => {
    const user = await reader()
    const list = await client.get('/api/v1/admin/users').loginAs(user)
    list.assertStatus(401)
  })

  test('an admin sends a reader their latest edition and it stamps last-sent', async ({
    client,
    assert,
  }) => {
    const user = await reader()
    await Edition.create({ userId: user.id, date: '2026-07-15', status: 'ready' })
    const token = await adminToken(client)

    const response = await client
      .post(`/api/v1/admin/users/${user.id}/send-edition`)
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(200)
    assert.equal(response.body().data.date, '2026-07-15')

    assert.lengthOf(sent, 1)
    assert.equal(sent[0].to, user.email)

    await user.refresh()
    assert.isNotNull(user.lastEditionSentAt)
    assert.isNotNull(response.body().data.user.lastEditionSentAt)
  })

  test('sending an edition to a reader with none returns 404', async ({ client }) => {
    const user = await reader()
    const token = await adminToken(client)

    const response = await client
      .post(`/api/v1/admin/users/${user.id}/send-edition`)
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(404)
  })

  test("an admin rebuilds today's edition for a reader", async ({ client, assert }) => {
    const user = await reader()
    const token = await adminToken(client)

    const response = await client
      .post(`/api/v1/admin/users/${user.id}/rebuild-edition`)
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(202)
    assert.equal(response.body().data.channel, editionChannelFor(user.id))
    // A build was queued for this reader today — not an email re-send.
    assert.lengthOf(dispatched, 1)
    assert.equal(dispatched[0].userId, user.id)
    assert.equal(dispatched[0].date, DateTime.now().toISODate())
    assert.lengthOf(sent, 0)
  })

  test('an admin rebuilds a specific date when one is given', async ({ client, assert }) => {
    const user = await reader()
    const token = await adminToken(client)

    const response = await client
      .post(`/api/v1/admin/users/${user.id}/rebuild-edition`)
      .header('Authorization', `Bearer ${token}`)
      .json({ date: '2026-07-15' })

    response.assertStatus(202)
    assert.equal(dispatched[0].date, '2026-07-15')
  })

  test('rebuilding for an unknown reader returns 404', async ({ client }) => {
    const token = await adminToken(client)

    const response = await client
      .post('/api/v1/admin/users/does-not-exist/rebuild-edition')
      .header('Authorization', `Bearer ${token}`)
    response.assertStatus(404)
  })
})
