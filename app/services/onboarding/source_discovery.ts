import { SourceDiscoverer } from '#services/orchestrator/source_discoverer'
import { FeedVerifier } from '#services/scout/feed_verifier'
import {
  makeYoutubeChannelResolver,
  type YoutubeChannelResolver,
} from '#services/scout/youtube_channel_resolver'
import type {
  DiscoverSourcesInput,
  DiscoveredChannel,
} from '#services/orchestrator/source_discoverer'
import type { SourceConfig, SourceType } from '#config/newspaper'

/**
 * A discovered source that has been verified and is ready to save: its type and
 * the settings bag for that type (a working feed url, or a resolved channel id).
 */
export interface VerifiedSource {
  type: SourceType
  name: string
  settings: SourceConfig['settings']
}

/**
 * Finds sources for a category and keeps only those that actually check out —
 * feeds that resolve and YouTube channels that resolve to a channel id. Kept
 * behind an interface with a swappable factory so the onboarding endpoint can be
 * exercised in tests without a real model or network.
 */
export interface SourceDiscovery {
  discoverVerified(input: DiscoverSourcesInput): Promise<VerifiedSource[]>
}

/**
 * The real discovery: ask the model, then drop any feed that does not resolve
 * and any channel that does not resolve to a real channel id.
 */
export class LlmSourceDiscovery implements SourceDiscovery {
  constructor(
    private discoverer = new SourceDiscoverer(),
    private verifier = new FeedVerifier(),
    private resolver: YoutubeChannelResolver = makeYoutubeChannelResolver()
  ) {}

  async discoverVerified(input: DiscoverSourcesInput): Promise<VerifiedSource[]> {
    const { feeds, channels } = await this.discoverer.discover(input)

    const working = new Set(await this.verifier.keepWorking(feeds.map((feed) => feed.feedUrl)))
    const feedSources: VerifiedSource[] = feeds
      .filter((feed) => working.has(feed.feedUrl))
      .map((feed) => ({ type: 'rss', name: feed.name, settings: { feedUrl: feed.feedUrl } }))

    const channelSources = await this.resolveChannels(channels)

    return [...feedSources, ...channelSources]
  }

  /**
   * Resolves each proposed channel to its channel id, keeping only the ones that
   * resolve. A channel the model invented or got wrong simply won't resolve — it
   * is dropped, the same way a dead feed is.
   */
  private async resolveChannels(channels: DiscoveredChannel[]): Promise<VerifiedSource[]> {
    const resolved: VerifiedSource[] = []
    for (const channel of channels) {
      try {
        const channelId = await this.resolver.resolve(channel.channelUrl)
        resolved.push({
          type: 'youtube',
          name: channel.name,
          settings: { channelUrl: channel.channelUrl, channelId },
        })
      } catch {
        // Unresolvable channel — drop it.
      }
    }
    return resolved
  }
}

let factory: () => SourceDiscovery = () => new LlmSourceDiscovery()

export function makeSourceDiscovery(): SourceDiscovery {
  return factory()
}

export function setSourceDiscovery(next: () => SourceDiscovery): void {
  factory = next
}

export function resetSourceDiscovery(): void {
  factory = () => new LlmSourceDiscovery()
}
