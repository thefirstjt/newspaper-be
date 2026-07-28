import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Category from '#models/category'
import Source from '#models/source'
import { backfillYoutubeChannelIds } from '#services/scout/youtube_channel_backfill'
import type { YoutubeChannelResolver } from '#services/scout/youtube_channel_resolver'

/** A resolver stub with a custom resolve behaviour, cast to the real type. */
function stubResolver(resolve: (url: string) => Promise<string>): YoutubeChannelResolver {
  return { resolve } as unknown as YoutubeChannelResolver
}

let counter = 0
async function categoryForNewReader() {
  counter += 1
  const user = await User.create({
    name: 'Reader',
    email: `backfill-${counter}@example.com`,
    password: 'secret123',
  })
  return Category.create({
    userId: user.id,
    key: 'eng-blogs',
    title: 'Engineering',
    min: 1,
    max: 2,
    poolSize: 6,
    relevanceHint: 'Deep engineering writing.',
  })
}

async function youtubeSource(
  category: Category,
  name: string,
  settings: { channelUrl?: string; channelId?: string }
) {
  return Source.create({
    userId: category.userId,
    categoryId: category.id,
    type: 'youtube',
    name,
    settings,
    enabled: true,
  })
}

test.group('backfillYoutubeChannelIds', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  test('resolves sources missing a real id (new url field or legacy url-in-id)', async ({
    assert,
  }) => {
    const category = await categoryForNewReader()
    // New style: url in channelUrl, no id yet.
    const newStyle = await youtubeSource(category, 'New style', {
      channelUrl: 'https://www.youtube.com/@needsid',
    })
    // Legacy style: the url was stored directly in channelId.
    const legacy = await youtubeSource(category, 'Legacy', {
      channelId: 'http://www.youtube.com/@AriseNewsChannel',
    })
    // Already a real UC… id (24 chars) — must be left alone.
    await youtubeSource(category, 'Has id', { channelId: 'UCHnyfMqiRRG1u-2MsSQLbXA' })
    // Not a youtube source — must be ignored.
    await Source.create({
      userId: category.userId,
      categoryId: category.id,
      type: 'rss',
      name: 'Feed',
      settings: { feedUrl: 'https://example.com/feed' },
      enabled: true,
    })

    let calls = 0
    const backfilled = await backfillYoutubeChannelIds(
      stubResolver(async () => {
        calls += 1
        return 'UCbackfilledId0000000000'
      })
    )

    assert.equal(backfilled, 2)
    assert.equal(calls, 2) // the two missing a real id; the resolved one is skipped

    await newStyle.refresh()
    assert.equal(newStyle.settings.channelId, 'UCbackfilledId0000000000')

    await legacy.refresh()
    assert.equal(legacy.settings.channelId, 'UCbackfilledId0000000000')
    // The legacy url is normalised into channelUrl.
    assert.equal(legacy.settings.channelUrl, 'http://www.youtube.com/@AriseNewsChannel')
  })

  test('leaves a source that fails to resolve untouched and keeps going', async ({ assert }) => {
    const category = await categoryForNewReader()
    const bad = await youtubeSource(category, 'Bad', {
      channelUrl: 'https://www.youtube.com/@bad',
    })
    const good = await youtubeSource(category, 'Good', {
      channelUrl: 'https://www.youtube.com/@good',
    })

    const backfilled = await backfillYoutubeChannelIds(
      stubResolver(async (url) => {
        if (url.includes('bad')) throw new Error('could not resolve')
        return 'UCgoodChannelId000000'
      })
    )

    assert.equal(backfilled, 1)
    await bad.refresh()
    assert.isUndefined(bad.settings.channelId) // still missing, will retry next run
    await good.refresh()
    assert.equal(good.settings.channelId, 'UCgoodChannelId000000')
  })
})
