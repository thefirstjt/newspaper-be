import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'

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

  test('readers can no longer rebuild their own edition', async ({ client }) => {
    const user = await reader()

    const response = await client.post('/api/v1/run-daily').loginAs(user)

    response.assertStatus(400)
  })

  test('requires authentication', async ({ client }) => {
    const response = await client.post('/api/v1/run-daily')
    response.assertStatus(401)
  })
})
