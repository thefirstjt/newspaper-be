import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { SeenUrlStore } from '#services/scout/seen_url_store'
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

test.group('SeenUrlStore', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  const store = new SeenUrlStore()

  test('filterUnseen drops candidates already recorded as seen', async ({ assert }) => {
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
    await store.markSeen([candidate('https://a.com'), candidate('https://a.com')])
    await store.markSeen([candidate('https://a.com')])

    assert.lengthOf(await SeenUrl.all(), 1)
  })
})
