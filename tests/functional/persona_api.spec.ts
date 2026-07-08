import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import ReaderDocument from '#models/reader_document'

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
    const response = await client.get('/api/v1/persona')
    response.assertStatus(401)
  })

  test('returns the reader persona, seeded from the template', async ({ client, assert }) => {
    const user = await reader()
    const response = await client.get('/api/v1/persona').loginAs(user)
    response.assertStatus(200)
    assert.isAbove(response.body().data.persona.trim().length, 0)
  })

  test('lets the reader edit their persona directly', async ({ client, assert }) => {
    const user = await reader()

    const response = await client
      .put('/api/v1/persona')
      .json({ content: 'A staff engineer who loves distributed systems.' })
      .loginAs(user)
    response.assertStatus(200)
    assert.equal(response.body().data.persona, 'A staff engineer who loves distributed systems.')

    const row = await ReaderDocument.query()
      .where('user_id', user.id)
      .where('key', 'persona')
      .firstOrFail()
    assert.equal(row.content, 'A staff engineer who loves distributed systems.')
  })

  test('rejects a direct edit with empty content', async ({ client }) => {
    const user = await reader()
    const response = await client.put('/api/v1/persona').json({ content: '' }).loginAs(user)
    response.assertStatus(422)
  })

  test('rejects a generate request with no role or learning goals', async ({ client }) => {
    const user = await reader()
    const response = await client
      .post('/api/v1/persona/generate')
      .json({ interests: ['databases'] })
      .loginAs(user)
    response.assertStatus(422)
  })
})
