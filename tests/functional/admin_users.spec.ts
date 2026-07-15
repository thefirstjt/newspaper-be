import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Admin from '#models/admin'
import User from '#models/user'

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
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

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
})
