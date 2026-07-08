import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Invitation from '#models/invitation'
import User from '#models/user'
import Category from '#models/category'
import GapTopic from '#models/gap_topic'
import UserSetting from '#models/user_setting'
import ReaderDocument from '#models/reader_document'

async function invite(email: string, overrides: Partial<Invitation> = {}) {
  return Invitation.create({
    email,
    token: `token-${email}`,
    status: 'pending',
    expiresAt: DateTime.now().plus({ days: 3 }),
    ...overrides,
  })
}

test.group('Onboarding — accept', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  test('confirms a valid invitation and returns the email', async ({ client, assert }) => {
    await invite('reader@example.com')
    const response = await client.get(
      '/api/v1/onboarding/invitation?token=token-reader@example.com'
    )
    response.assertStatus(200)
    assert.equal(response.body().data.email, 'reader@example.com')
  })

  test('rejects an unknown or expired invitation', async ({ client }) => {
    const unknown = await client.get('/api/v1/onboarding/invitation?token=nope')
    unknown.assertStatus(404)

    await invite('old@example.com', { expiresAt: DateTime.now().minus({ days: 1 }) })
    const expired = await client.get('/api/v1/onboarding/invitation?token=token-old@example.com')
    expired.assertStatus(404)
  })

  test('accepting creates the account with basics only and logs the reader in', async ({
    client,
    assert,
  }) => {
    const invitation = await invite('new@example.com')

    const response = await client
      .post('/api/v1/onboarding/accept')
      .json({ token: invitation.token, name: 'New Reader', password: 'secret123' })
    response.assertStatus(200)

    const user = await User.findByOrFail('email', 'new@example.com')
    assert.equal(user.name, 'New Reader')
    assert.isTrue(Boolean(user.isActive))

    // Only the basics are seeded — no categories or gap topics yet.
    assert.isNotNull(await UserSetting.findBy('user_id', user.id))
    assert.lengthOf(await ReaderDocument.query().where('user_id', user.id), 3)
    assert.lengthOf(await Category.query().where('user_id', user.id), 0)
    assert.lengthOf(await GapTopic.query().where('user_id', user.id), 0)

    // The invitation is marked accepted and linked to the new reader.
    await invitation.refresh()
    assert.equal(invitation.status, 'accepted')
    assert.equal(invitation.acceptedUserId, user.id)

    // The returned token authenticates.
    const profile = await client
      .get('/api/v1/account/profile')
      .header('Authorization', `Bearer ${response.body().data.token}`)
    profile.assertStatus(200)
  })

  test('an invitation cannot be accepted twice', async ({ client }) => {
    const invitation = await invite('once@example.com')
    const body = { token: invitation.token, name: 'Once', password: 'secret123' }

    const first = await client.post('/api/v1/onboarding/accept').json(body)
    first.assertStatus(200)

    const second = await client.post('/api/v1/onboarding/accept').json(body)
    second.assertStatus(422)
  })
})
