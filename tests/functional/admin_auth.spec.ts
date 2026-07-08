import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Admin from '#models/admin'
import User from '#models/user'

test.group('Admin auth', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  async function makeAdmin() {
    return Admin.create({ username: 'root', password: 'supersecret' })
  }

  test('an admin logs in and reaches an admin-only route', async ({ client, assert }) => {
    await makeAdmin()

    const login = await client
      .post('/api/v1/admin/login')
      .json({ username: 'root', password: 'supersecret' })
    login.assertStatus(200)
    const token = login.body().data.token
    assert.exists(token)

    const me = await client.get('/api/v1/admin/me').header('Authorization', `Bearer ${token}`)
    me.assertStatus(200)
    assert.equal(me.body().data.username, 'root')
  })

  test('bad admin credentials are rejected', async ({ client }) => {
    await makeAdmin()
    const login = await client
      .post('/api/v1/admin/login')
      .json({ username: 'root', password: 'wrong' })
    login.assertStatus(400)
  })

  test('a reader token cannot reach an admin route', async ({ client }) => {
    await makeAdmin()
    const reader = await User.create({
      name: 'Reader',
      email: 'reader@example.com',
      password: 'secret123',
    })

    const me = await client.get('/api/v1/admin/me').loginAs(reader)
    me.assertStatus(401)
  })

  test('an unauthenticated request cannot reach an admin route', async ({ client }) => {
    const me = await client.get('/api/v1/admin/me')
    me.assertStatus(401)
  })
})
