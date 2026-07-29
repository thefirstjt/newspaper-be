import { test } from '@japa/runner'
import { LlmSourceDiscovery } from '#services/onboarding/source_discovery'
import type { SourceDiscoverer, DiscoveryResult } from '#services/orchestrator/source_discoverer'
import type { FeedVerifier } from '#services/scout/feed_verifier'
import type { YoutubeChannelResolver } from '#services/scout/youtube_channel_resolver'

/** A discoverer that returns a canned model result. */
function discovererReturning(result: DiscoveryResult): SourceDiscoverer {
  return { discover: async () => result } as unknown as SourceDiscoverer
}

/** A feed verifier that keeps only the urls in `working`. */
function verifierKeeping(working: string[]): FeedVerifier {
  return {
    keepWorking: async (urls: string[]) => urls.filter((url) => working.includes(url)),
  } as unknown as FeedVerifier
}

/** A channel resolver that resolves the urls in `map` and rejects the rest. */
function resolverFor(map: Record<string, string>): YoutubeChannelResolver {
  return {
    resolve: async (url: string) => {
      const id = map[url]
      if (!id) throw new Error('cannot resolve')
      return id
    },
  } as unknown as YoutubeChannelResolver
}

test.group('LlmSourceDiscovery', () => {
  test('keeps working feeds and resolvable channels, drops the rest', async ({ assert }) => {
    const discovery = new LlmSourceDiscovery(
      discovererReturning({
        feeds: [
          { name: 'Good Feed', feedUrl: 'https://good.com/feed' },
          { name: 'Dead Feed', feedUrl: 'https://dead.com/feed' },
        ],
        channels: [
          { name: 'Real Channel', channelUrl: 'https://www.youtube.com/@real' },
          { name: 'Fake Channel', channelUrl: 'https://www.youtube.com/@fake' },
        ],
      }),
      verifierKeeping(['https://good.com/feed']),
      resolverFor({ 'https://www.youtube.com/@real': 'UCrealChannelId000000' })
    )

    const sources = await discovery.discoverVerified({
      categoryTitle: 'Science',
      relevanceHint: '',
    })

    assert.deepEqual(sources, [
      { type: 'rss', name: 'Good Feed', settings: { feedUrl: 'https://good.com/feed' } },
      {
        type: 'youtube',
        name: 'Real Channel',
        settings: {
          channelUrl: 'https://www.youtube.com/@real',
          channelId: 'UCrealChannelId000000',
        },
      },
    ])
  })
})
