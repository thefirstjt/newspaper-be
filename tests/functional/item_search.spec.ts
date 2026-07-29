import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Edition from '#models/edition'
import Item from '#models/item'

let counter = 0
async function reader() {
  counter += 1
  return User.create({
    name: 'Reader',
    email: `search-${counter}@example.com`,
    password: 'secret123',
  })
}

async function itemFor(user: User, date: string, title: string) {
  const edition = await Edition.firstOrCreate(
    { userId: user.id, date },
    { userId: user.id, date, status: 'ready' }
  )
  counter += 1
  return Item.create({
    userId: user.id,
    editionId: edition.id,
    categoryKey: 'eng-blogs',
    url: `https://example.com/${counter}`,
    urlHash: `hash-${counter}`,
    title,
    mediaType: 'article',
    state: 'surfaced',
  })
}

test.group('Item search', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  test('finds items by partial, case-insensitive title, with their edition date', async ({
    client,
    assert,
  }) => {
    const user = await reader()
    await itemFor(user, '2026-07-01', 'The Rise of Distributed Systems')
    await itemFor(user, '2026-07-02', 'A Guide to Databases')

    const response = await client.get('/api/v1/items/search?q=distributed').loginAs(user)

    response.assertStatus(200)
    const items = response.body().data.items
    assert.lengthOf(items, 1)
    assert.equal(items[0].title, 'The Rise of Distributed Systems')
    assert.equal(items[0].date, '2026-07-01')
  })

  test("only searches the reader's own items", async ({ client, assert }) => {
    const alice = await reader()
    await itemFor(alice, '2026-07-01', 'Alice on distributed systems')
    const bob = await reader()

    const response = await client.get('/api/v1/items/search?q=distributed').loginAs(bob)

    response.assertStatus(200)
    assert.lengthOf(response.body().data.items, 0)
  })

  test('returns nothing for a blank query', async ({ client, assert }) => {
    const user = await reader()
    await itemFor(user, '2026-07-01', 'Anything at all')

    const response = await client.get('/api/v1/items/search?q=').loginAs(user)

    response.assertStatus(200)
    assert.lengthOf(response.body().data.items, 0)
  })
})
