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

test.group('Persona API', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  test('requires authentication', async ({ client }) => {
    const response = await client.put('/api/v1/persona').json({
      role: 'Engineer',
      learningGoals: ['distributed systems'],
    })
    response.assertStatus(401)
  })

  test('rejects a persona request with no role or learning goals', async ({ client }) => {
    const user = await reader()
    const response = await client
      .put('/api/v1/persona')
      .json({ interests: ['databases'] })
      .loginAs(user)
    response.assertStatus(422)
  })
})
