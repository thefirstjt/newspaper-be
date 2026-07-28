import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import YoutubeChannel from '#models/youtube_channel'
import {
  YoutubeChannelResolver,
  YoutubeChannelResolutionError,
} from '#services/scout/youtube_channel_resolver'

const CHANNEL_ID = 'UCHnyfMqiRRG1u-2MsSQLbXA'

/** A fake fetch that returns a canned channels response and counts its calls. */
function fakeFetch(body: unknown, ok = true, status = 200) {
  const calls = { count: 0 }
  const fetchImpl = (async () => {
    calls.count += 1
    return { ok, status, json: async () => body, text: async () => JSON.stringify(body) }
  }) as unknown as typeof fetch
  return { fetchImpl, calls }
}

/** Runs a rejecting call and returns the error it threw. */
async function rejection(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn()
    return null
  } catch (error) {
    return error
  }
}

test.group('YoutubeChannelResolver', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  test('reads the id straight from a /channel/ url without calling the api', async ({ assert }) => {
    const { fetchImpl, calls } = fakeFetch({})
    const resolver = new YoutubeChannelResolver('key', fetchImpl)

    const id = await resolver.resolve(`https://www.youtube.com/channel/${CHANNEL_ID}`)

    assert.equal(id, CHANNEL_ID)
    assert.equal(calls.count, 0)
  })

  test('resolves a @handle through the api and caches the mapping', async ({ assert }) => {
    const { fetchImpl, calls } = fakeFetch({ items: [{ id: CHANNEL_ID }] })
    const resolver = new YoutubeChannelResolver('key', fetchImpl)

    const id = await resolver.resolve('https://www.youtube.com/@Niko')

    assert.equal(id, CHANNEL_ID)
    assert.equal(calls.count, 1)
    const cached = await YoutubeChannel.findBy('handle', 'niko')
    assert.equal(cached?.channelId, CHANNEL_ID)
  })

  test('returns a cached handle without calling the api again', async ({ assert }) => {
    await YoutubeChannel.create({ handle: 'niko', channelId: CHANNEL_ID })
    const { fetchImpl, calls } = fakeFetch({ items: [{ id: 'UCshouldNeverBeReadxxxx' }] })
    const resolver = new YoutubeChannelResolver('key', fetchImpl)

    const id = await resolver.resolve('https://www.youtube.com/@niko')

    assert.equal(id, CHANNEL_ID)
    assert.equal(calls.count, 0)
  })

  test('rejects an unsupported channel url as a reader error', async ({ assert }) => {
    const { fetchImpl } = fakeFetch({})
    const resolver = new YoutubeChannelResolver('key', fetchImpl)

    const error = await rejection(() =>
      resolver.resolve('https://www.youtube.com/c/SomeLegacyName')
    )

    assert.instanceOf(error, YoutubeChannelResolutionError)
  })

  test('rejects a url that points at no channel as a reader error', async ({ assert }) => {
    const { fetchImpl } = fakeFetch({ items: [] })
    const resolver = new YoutubeChannelResolver('key', fetchImpl)

    const error = await rejection(() => resolver.resolve('https://www.youtube.com/@ghost'))

    assert.instanceOf(error, YoutubeChannelResolutionError)
  })

  test('a missing api key is a server error, not a reader error', async ({ assert }) => {
    const { fetchImpl } = fakeFetch({})
    const resolver = new YoutubeChannelResolver(undefined, fetchImpl)

    const error = await rejection(() => resolver.resolve('https://www.youtube.com/@Niko'))

    assert.instanceOf(error, Error)
    assert.notInstanceOf(error, YoutubeChannelResolutionError)
  })

  test('a failing youtube api is a server error, not a reader error', async ({ assert }) => {
    const { fetchImpl } = fakeFetch({ error: 'bad request' }, false, 400)
    const resolver = new YoutubeChannelResolver('key', fetchImpl)

    const error = await rejection(() => resolver.resolve('https://www.youtube.com/@Niko'))

    assert.instanceOf(error, Error)
    assert.notInstanceOf(error, YoutubeChannelResolutionError)
  })
})
