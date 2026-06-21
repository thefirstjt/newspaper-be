import { test } from '@japa/runner'
import { XFetcher } from '#services/scout/x_fetcher'
import type { SourceConfig } from '#config/newspaper'
import type { XAccountCache } from '#services/scout/types'

/** An in-memory account cache so tests do not touch the database. */
function memoryCache(
  seed: Record<string, string> = {}
): XAccountCache & { stored: Map<string, string> } {
  const stored = new Map(Object.entries(seed))
  return {
    stored,
    async lookup(username) {
      return stored.get(username) ?? null
    },
    async remember(username, userId) {
      stored.set(username, userId)
    },
  }
}

/** A fake fetch that answers the user-lookup and timeline endpoints from canned data. */
function fakeFetch(responses: {
  userId?: string
  posts?: unknown[]
  includes?: unknown
  status?: number
}) {
  const calls: string[] = []
  const impl = async (input: string | URL) => {
    const url = input.toString()
    calls.push(url)
    const body = url.includes('/users/by/username/')
      ? { data: responses.userId ? { id: responses.userId } : undefined }
      : { data: responses.posts ?? [], includes: responses.includes }
    return {
      ok: responses.status ? responses.status < 400 : true,
      status: responses.status ?? 200,
      json: async () => body,
    }
  }
  return { impl: impl as unknown as typeof fetch, calls }
}

function source(username: string): SourceConfig {
  return { type: 'x', name: 'Andrej Karpathy', settings: { username } }
}

test.group('XFetcher', () => {
  test('resolves a handle to an id, then reuses the cache on later runs', async ({ assert }) => {
    const cache = memoryCache()
    const post = { id: '111', text: 'A thought.', created_at: '2026-06-21T09:00:00.000Z' }

    const first = fakeFetch({ userId: '2244', posts: [post] })
    await new XFetcher('token', cache, first.impl).fetch(source('karpathy'))

    assert.equal(cache.stored.get('karpathy'), '2244')
    assert.isTrue(first.calls.some((url) => url.includes('/users/by/username/karpathy')))

    const second = fakeFetch({ posts: [post] })
    await new XFetcher('token', cache, second.impl).fetch(source('karpathy'))

    assert.isFalse(
      second.calls.some((url) => url.includes('/users/by/username/')),
      'a cached handle should not be looked up again'
    )
  })

  test('keeps retweets and points a shared link at the link itself', async ({ assert }) => {
    const cache = memoryCache({ karpathy: '2244' })
    const post = {
      id: '999',
      text: 'Worth a read.\nMore detail here.',
      created_at: '2026-06-21T09:00:00.000Z',
      entities: {
        urls: [
          { expanded_url: 'https://example.com/paper' },
          { expanded_url: 'https://x.com/karpathy/status/999' },
        ],
      },
    }
    const { impl, calls } = fakeFetch({ posts: [post] })

    const candidates = await new XFetcher('token', cache, impl).fetch(source('karpathy'))

    const timelineUrl = calls.find((url) => url.includes('/users/2244/tweets'))!
    assert.match(timelineUrl, /exclude=replies(?!%2Cretweets)/)

    assert.lengthOf(candidates, 1)
    const candidate = candidates[0]
    assert.equal(candidate.url, 'https://example.com/paper')
    assert.equal(candidate.title, 'Worth a read.')
    assert.include(candidate.snippet, 'Worth a read.')
  })

  test('follows a retweet to the original post for its words, links and author', async ({
    assert,
  }) => {
    const cache = memoryCache({ karpathy: '2244' })
    const post = {
      id: '1',
      text: 'RT @orig: a brilliant thread about…',
      created_at: '2026-06-21T09:00:00.000Z',
      author_id: '2244',
      referenced_tweets: [{ type: 'retweeted', id: '500' }],
    }
    const includes = {
      tweets: [
        {
          id: '500',
          text: 'A brilliant thread about distributed systems.',
          created_at: '2026-06-20T09:00:00.000Z',
          author_id: '77',
          entities: { urls: [{ expanded_url: 'https://example.com/thread' }] },
        },
      ],
      users: [{ id: '77', name: 'Original Author', username: 'orig' }],
    }
    const { impl } = fakeFetch({ posts: [post], includes })

    const [candidate] = await new XFetcher('token', cache, impl).fetch(source('karpathy'))

    assert.equal(candidate.url, 'https://example.com/thread')
    assert.equal(candidate.author, 'Original Author')
    assert.include(candidate.snippet, 'A brilliant thread about distributed systems.')
    assert.include(candidate.snippet, 'Retweeted from @orig')
    assert.notInclude(candidate.title, 'RT @orig')
  })

  test('links a retweet without a shared link back to the original post', async ({ assert }) => {
    const cache = memoryCache({ karpathy: '2244' })
    const post = {
      id: '1',
      text: 'RT @orig: just a thought',
      author_id: '2244',
      referenced_tweets: [{ type: 'retweeted', id: '500' }],
    }
    const includes = {
      tweets: [{ id: '500', text: 'Just a thought, no link.', author_id: '77' }],
      users: [{ id: '77', name: 'Original Author', username: 'orig' }],
    }
    const { impl } = fakeFetch({ posts: [post], includes })

    const [candidate] = await new XFetcher('token', cache, impl).fetch(source('karpathy'))

    assert.equal(candidate.url, 'https://x.com/orig/status/500')
  })

  test('fails clearly when the handle cannot be resolved', async ({ assert }) => {
    const { impl } = fakeFetch({ posts: [] })
    await assert.rejects(
      () => new XFetcher('token', memoryCache(), impl).fetch(source('ghost')),
      /could not be resolved/
    )
  })
})
