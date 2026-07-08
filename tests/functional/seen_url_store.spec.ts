import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { SeenUrlStore } from '#services/scout/seen_url_store'
import User from '#models/user'
import SeenUrl from '#models/seen_url'
import type { ScoutedCandidate } from '#services/scout/types'

function candidate(url: string): ScoutedCandidate {
  return {
    categoryKey: 'cat-a',
    url,
    urlHash: `hash-${url}`,
    title: 'Title',
    snippet: 'Snippet',
    sourceName: 'Source',
    author: null,
    publishedAt: null,
    mediaType: 'article',
  }
}

let counter = 0
async function makeUser() {
  counter += 1
  return User.create({
    name: 'Reader',
    email: `reader-${counter}@example.com`,
    password: 'secret123',
  })
}

test.group('SeenUrlStore', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  test('filterUnseen drops candidates already recorded as seen', async ({ assert }) => {
    const user = await makeUser()
    const store = new SeenUrlStore(user.id)
    await store.markSeen([candidate('https://a.com'), candidate('https://b.com')])

    const remaining = await store.filterUnseen([
      candidate('https://a.com'),
      candidate('https://c.com'),
    ])

    assert.deepEqual(
      remaining.map((item) => item.url),
      ['https://c.com']
    )
  })

  test('markSeen is idempotent and dedupes within a batch', async ({ assert }) => {
    const user = await makeUser()
    const store = new SeenUrlStore(user.id)
    await store.markSeen([candidate('https://a.com'), candidate('https://a.com')])
    await store.markSeen([candidate('https://a.com')])

    assert.lengthOf(await SeenUrl.all(), 1)
  })

  test("one reader's seen urls do not affect another's", async ({ assert }) => {
    const aliceUser = await makeUser()
    const bobUser = await makeUser()
    const alice = new SeenUrlStore(aliceUser.id)
    const bob = new SeenUrlStore(bobUser.id)

    await alice.markSeen([candidate('https://shared.com')])

    // Bob has never seen it, so it survives his filter.
    const remaining = await bob.filterUnseen([candidate('https://shared.com')])
    assert.lengthOf(remaining, 1)
  })
})
