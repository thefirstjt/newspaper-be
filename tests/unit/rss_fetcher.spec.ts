import { test } from '@japa/runner'
import { RssFetcher } from '#services/scout/rss_fetcher'
import type { SourceConfig } from '#config/newspaper'

const source: SourceConfig = {
  type: 'rss',
  name: 'Test Feed',
  settings: { feedUrl: 'https://example.com/feed' },
}

function fetcherFor(items: any[]) {
  return new RssFetcher({ parseURL: async () => ({ items }) as any })
}

test.group('RssFetcher', () => {
  test('maps feed entries to candidates', async ({ assert }) => {
    const fetcher = fetcherFor([
      {
        title: 'A System Design Post',
        link: 'https://example.com/post',
        contentSnippet: 'A short snippet.',
        creator: 'Jane Dev',
        isoDate: '2026-05-20T10:00:00.000Z',
      },
    ])

    const [candidate] = await fetcher.fetch(source)

    assert.equal(candidate.url, 'https://example.com/post')
    assert.equal(candidate.title, 'A System Design Post')
    assert.equal(candidate.snippet, 'A short snippet.')
    assert.equal(candidate.author, 'Jane Dev')
    assert.equal(candidate.sourceName, 'Test Feed')
    assert.equal(candidate.mediaType, 'article')
    assert.equal(candidate.publishedAt?.toISODate(), '2026-05-20')
  })

  test('treats an audio enclosure as a podcast', async ({ assert }) => {
    const fetcher = fetcherFor([
      {
        title: 'Episode 12',
        link: 'https://example.com/ep12',
        enclosure: { url: 'a.mp3', type: 'audio/mpeg' },
      },
    ])

    const [candidate] = await fetcher.fetch(source)
    assert.equal(candidate.mediaType, 'podcast')
  })

  test('skips entries without a link', async ({ assert }) => {
    const fetcher = fetcherFor([
      { title: 'No link here' },
      { title: 'Has a link', link: 'https://example.com/ok' },
    ])

    const candidates = await fetcher.fetch(source)
    assert.lengthOf(candidates, 1)
    assert.equal(candidates[0].url, 'https://example.com/ok')
  })

  test('throws when the source has no feed url', async ({ assert }) => {
    const fetcher = fetcherFor([])
    await assert.rejects(
      () => fetcher.fetch({ type: 'rss', name: 'Broken', settings: {} }),
      /no feedUrl/
    )
  })
})
