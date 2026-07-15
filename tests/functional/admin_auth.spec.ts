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

  async function tokenFor(client: import('@japa/api-client').ApiClient, password = 'supersecret') {
    const login = await client.post('/api/v1/admin/login').json({ username: 'root', password })
    return login.body().data.token as string
  }

  test('logging in stamps last-logged-in and returns it', async ({ client, assert }) => {
    await makeAdmin()

    const login = await client
      .post('/api/v1/admin/login')
      .json({ username: 'root', password: 'supersecret' })
    login.assertStatus(200)
    assert.isNotNull(login.body().data.admin.lastLoggedInAt)

    const admin = await Admin.findByOrFail('username', 'root')
    assert.isNotNull(admin.lastLoggedInAt)
  })

  test('an admin changes their own password', async ({ client }) => {
    await makeAdmin()
    const token = await tokenFor(client)

    const reset = await client
      .post('/api/v1/admin/reset-password')
      .header('Authorization', `Bearer ${token}`)
      .json({ currentPassword: 'supersecret', newPassword: 'brandnew1' })
    reset.assertStatus(200)

    // The old password no longer works; the new one does.
    const oldLogin = await client
      .post('/api/v1/admin/login')
      .json({ username: 'root', password: 'supersecret' })
    oldLogin.assertStatus(400)
    const newLogin = await client
      .post('/api/v1/admin/login')
      .json({ username: 'root', password: 'brandnew1' })
    newLogin.assertStatus(200)
  })

  test('resetting with the wrong current password is rejected', async ({ client }) => {
    await makeAdmin()
    const token = await tokenFor(client)

    const reset = await client
      .post('/api/v1/admin/reset-password')
      .header('Authorization', `Bearer ${token}`)
      .json({ currentPassword: 'wrong', newPassword: 'brandnew1' })
    reset.assertStatus(422)
  })

  test('a new password that is too short or lacks a number is rejected', async ({ client }) => {
    await makeAdmin()
    const token = await tokenFor(client)

    for (const newPassword of ['short1', 'nodigitshere']) {
      const reset = await client
        .post('/api/v1/admin/reset-password')
        .header('Authorization', `Bearer ${token}`)
        .json({ currentPassword: 'supersecret', newPassword })
      reset.assertStatus(422)
    }
  })

  test('resetting a password requires authentication', async ({ client }) => {
    const reset = await client
      .post('/api/v1/admin/reset-password')
      .json({ currentPassword: 'supersecret', newPassword: 'brandnew1' })
    reset.assertStatus(401)
  })
})
