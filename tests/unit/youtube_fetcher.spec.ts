import { test } from '@japa/runner'
import { YoutubeFetcher } from '#services/scout/youtube_fetcher'
import type { SourceConfig } from '#config/newspaper'

const source: SourceConfig = {
  type: 'youtube',
  name: 'Pragmatic Channel',
  settings: { channelId: 'UC123' },
}

function fetcherReturning(body: unknown, ok = true, status = 200) {
  const fetchImpl = (async () => ({
    ok,
    status,
    json: async () => body,
  })) as unknown as typeof fetch
  return new YoutubeFetcher('test-key', fetchImpl)
}

test.group('YoutubeFetcher', () => {
  test('maps videos to candidates and skips items without a video id', async ({ assert }) => {
    const fetcher = fetcherReturning({
      items: [
        {
          id: { videoId: 'abc123' },
          snippet: {
            title: 'How we scaled',
            description: 'A talk on scaling.',
            publishedAt: '2026-05-21T09:00:00Z',
            channelTitle: 'Pragmatic Channel',
          },
        },
        { id: {}, snippet: { title: 'No id' } },
      ],
    })

    const candidates = await fetcher.fetch(source)

    assert.lengthOf(candidates, 1)
    assert.equal(candidates[0].url, 'https://www.youtube.com/watch?v=abc123')
    assert.equal(candidates[0].title, 'How we scaled')
    assert.equal(candidates[0].mediaType, 'video')
    assert.equal(candidates[0].author, 'Pragmatic Channel')
    assert.equal(candidates[0].publishedAt?.toISODate(), '2026-05-21')
  })

  test('throws when the api responds with an error status', async ({ assert }) => {
    const fetcher = fetcherReturning({}, false, 403)
    await assert.rejects(() => fetcher.fetch(source), /status 403/)
  })
})
