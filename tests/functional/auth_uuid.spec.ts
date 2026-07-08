import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Invitation from '#models/invitation'

/** Matches a UUID v7 (the version nibble is 7). */
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

test.group('UUID user ids and auth', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  test('a new user gets a UUID v7 id', async ({ assert }) => {
    const user = await User.create({
      name: 'Reader',
      email: 'a@example.com',
      password: 'secret123',
    })
    assert.match(user.id, UUID_V7)
  })

  test('the token returned when accepting an invite authenticates and is tied to the UUID id', async ({
    client,
    assert,
  }) => {
    await Invitation.create({
      email: 'b@example.com',
      token: 'invite-token',
      status: 'pending',
      expiresAt: DateTime.now().plus({ days: 3 }),
    })

    const accept = await client.post('/api/v1/onboarding/accept').json({
      token: 'invite-token',
      name: 'Reader',
      password: 'secret123',
    })
    accept.assertStatus(200)

    const userId = accept.body().data.user.id
    const token = accept.body().data.token
    assert.match(userId, UUID_V7)

    // The token authenticates a protected route.
    const profile = await client
      .get('/api/v1/account/profile')
      .header('Authorization', `Bearer ${token}`)
    profile.assertStatus(200)
    assert.equal(profile.body().data.id, userId)

    // The access token row points at the UUID user id.
    const row = await db.from('auth_access_tokens').where('tokenable_id', userId).first()
    assert.isNotNull(row)
  })
})
