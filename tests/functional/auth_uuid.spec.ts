import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'

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

  test('the token returned at signup authenticates and is tied to the UUID id', async ({
    client,
    assert,
  }) => {
    const signup = await client.post('/api/v1/auth/signup').json({
      name: 'Reader',
      email: 'b@example.com',
      password: 'secret123',
      passwordConfirmation: 'secret123',
    })
    signup.assertStatus(200)

    const userId = signup.body().data.user.id
    const token = signup.body().data.token
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
