import { DateTime } from 'luxon'
import type { SourceConfig } from '#config/newspaper'
import type { RawCandidate, SourceFetcher } from '#services/scout/types'

const MAX_RESULTS = 5
const SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search'

/** How long to wait for the API before giving up, so one slow call can't stall a run. */
const REQUEST_TIMEOUT_MS = 10_000

interface YoutubeSearchResponse {
  items?: Array<{
    id?: { videoId?: string }
    snippet?: {
      title?: string
      description?: string
      publishedAt?: string
      channelTitle?: string
    }
  }>
}

/**
 * Fetches a channel's most recent videos through the YouTube Data API. The
 * fetch implementation is injectable so tests can return a canned response
 * without hitting the network.
 */
export class YoutubeFetcher implements SourceFetcher {
  constructor(
    private apiKey: string,
    private fetchImpl: typeof fetch = fetch
  ) {}

  async fetch(source: SourceConfig): Promise<RawCandidate[]> {
    const channelId = source.settings.channelId
    if (!channelId) {
      throw new Error(`YouTube source "${source.name}" has no channelId configured.`)
    }

    const url = new URL(SEARCH_ENDPOINT)
    url.searchParams.set('key', this.apiKey)
    url.searchParams.set('channelId', channelId)
    url.searchParams.set('part', 'snippet')
    url.searchParams.set('type', 'video')
    url.searchParams.set('order', 'date')
    url.searchParams.set('maxResults', String(MAX_RESULTS))

    const response = await this.fetchImpl(url.toString(), {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`YouTube request for "${source.name}" failed with status ${response.status}.`)
    }

    const body = (await response.json()) as YoutubeSearchResponse

    return (body.items ?? [])
      .filter((item) => item.id?.videoId)
      .map((item) => ({
        url: `https://www.youtube.com/watch?v=${item.id!.videoId}`,
        title: (item.snippet?.title ?? '').trim(),
        snippet: (item.snippet?.description ?? '').trim(),
        sourceName: source.name,
        author: item.snippet?.channelTitle?.trim() || null,
        publishedAt: parseDate(item.snippet?.publishedAt),
        mediaType: 'video' as const,
      }))
  }
}

function parseDate(value: string | undefined): DateTime | null {
  if (!value) {
    return null
  }
  const parsed = DateTime.fromISO(value)
  return parsed.isValid ? parsed : null
}
