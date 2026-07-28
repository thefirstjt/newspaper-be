import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import YoutubeChannel from '#models/youtube_channel'
import { YoutubeChannelResolver } from '#services/scout/youtube_channel_resolver'

const CHANNEL_ID = 'UCHnyfMqiRRG1u-2MsSQLbXA'

/** A fake fetch that returns a canned channels response and counts its calls. */
function fakeFetch(body: unknown, ok = true, status = 200) {
  const calls = { count: 0 }
  const fetchImpl = (async () => {
    calls.count += 1
    return { ok, status, json: async () => body }
  }) as unknown as typeof fetch
  return { fetchImpl, calls }
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

  test('rejects an unsupported channel url', async ({ assert }) => {
    const { fetchImpl } = fakeFetch({})
    const resolver = new YoutubeChannelResolver('key', fetchImpl)
    await assert.rejects(
      () => resolver.resolve('https://www.youtube.com/c/SomeLegacyName'),
      /Enter a YouTube channel url/
    )
  })

  test('rejects a handle when no api key is configured and it is not cached', async ({
    assert,
  }) => {
    const { fetchImpl } = fakeFetch({})
    const resolver = new YoutubeChannelResolver(undefined, fetchImpl)
    await assert.rejects(
      () => resolver.resolve('https://www.youtube.com/@Niko'),
      /needs a configured YouTube API key/
    )
  })

  test('rejects when the api finds no channel for the handle', async ({ assert }) => {
    const { fetchImpl } = fakeFetch({ items: [] })
    const resolver = new YoutubeChannelResolver('key', fetchImpl)
    await assert.rejects(
      () => resolver.resolve('https://www.youtube.com/@ghost'),
      /No YouTube channel/
    )
  })
})
