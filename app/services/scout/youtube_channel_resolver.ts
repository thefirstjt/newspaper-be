import env from '#start/env'
import YoutubeChannel from '#models/youtube_channel'

const CHANNELS_ENDPOINT = 'https://www.googleapis.com/youtube/v3/channels'

/** How long to wait for the API before giving up, so one slow call can't stall a request. */
const REQUEST_TIMEOUT_MS = 10_000

/**
 * Raised when a channel url cannot be turned into a channel id — a malformed
 * url, an unsupported shape, a handle with no matching channel, or a handle that
 * needs the API when no key is configured. The message is safe to show a reader.
 */
export class YoutubeChannelResolutionError extends Error {}

/** The two channel-url shapes we accept, once parsed. */
type ParsedChannel = { kind: 'channelId'; channelId: string } | { kind: 'handle'; handle: string }

/**
 * Turns a YouTube channel url into the UC… channel id the scout needs. Two url
 * shapes are accepted: a `/channel/UC…` url already carries the id, so it is read
 * straight off the path; a `/@handle` url is resolved to its id through the
 * YouTube Data API. Handle lookups go through a global cache first, so the same
 * handle is only ever resolved once. The fetch implementation is injectable so
 * tests can return a canned response without hitting the network.
 */
export class YoutubeChannelResolver {
  constructor(
    private apiKey: string | undefined,
    private fetchImpl: typeof fetch = fetch
  ) {}

  async resolve(channelUrl: string): Promise<string> {
    const parsed = parseChannelUrl(channelUrl)
    if (!parsed) {
      throw new YoutubeChannelResolutionError(
        'Enter a YouTube channel url like https://www.youtube.com/@handle or https://www.youtube.com/channel/UC….'
      )
    }

    if (parsed.kind === 'channelId') {
      return parsed.channelId
    }

    return this.resolveHandle(parsed.handle)
  }

  private async resolveHandle(handle: string): Promise<string> {
    const cached = await YoutubeChannel.findBy('handle', handle)
    if (cached) {
      return cached.channelId
    }

    if (!this.apiKey) {
      throw new YoutubeChannelResolutionError(
        `Resolving @${handle} needs a configured YouTube API key. Paste the channel's /channel/UC… url instead, or set YOUTUBE_API_KEY.`
      )
    }

    const channelId = await this.fetchChannelIdForHandle(handle)
    // updateOrCreate rather than create so a race between two adds of the same
    // handle can't trip the unique constraint.
    await YoutubeChannel.updateOrCreate({ handle }, { channelId })
    return channelId
  }

  private async fetchChannelIdForHandle(handle: string): Promise<string> {
    const url = new URL(CHANNELS_ENDPOINT)
    url.searchParams.set('key', this.apiKey!)
    url.searchParams.set('part', 'id')
    url.searchParams.set('forHandle', handle)

    const response = await this.fetchImpl(url.toString(), {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new YoutubeChannelResolutionError(
        `YouTube could not be reached to resolve @${handle} (status ${response.status}).`
      )
    }

    const body = (await response.json()) as { items?: Array<{ id?: string }> }
    const channelId = body.items?.[0]?.id
    if (!channelId) {
      throw new YoutubeChannelResolutionError(`No YouTube channel was found for @${handle}.`)
    }
    return channelId
  }
}

/** Builds a resolver wired to the configured YouTube API key. */
export function makeYoutubeChannelResolver(): YoutubeChannelResolver {
  return new YoutubeChannelResolver(env.get('YOUTUBE_API_KEY'))
}

/**
 * Reads a channel url into either the channel id it already carries or the
 * handle to resolve. Returns null for anything we do not support (a bad url, a
 * legacy /c/ or /user/ url, a bare handle), so the caller can ask for a better one.
 */
function parseChannelUrl(raw: string): ParsedChannel | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }

  if (!/(^|\.)youtube\.com$/i.test(url.hostname)) {
    return null
  }

  const segments = url.pathname.split('/').filter(Boolean)

  // https://www.youtube.com/channel/UC… — the id is right there on the path.
  if (segments[0] === 'channel' && segments[1]) {
    return isChannelId(segments[1]) ? { kind: 'channelId', channelId: segments[1] } : null
  }

  // https://www.youtube.com/@handle
  if (segments[0]?.startsWith('@') && segments[0].length > 1) {
    return { kind: 'handle', handle: normalizeHandle(segments[0]) }
  }

  return null
}

/** A YouTube channel id is "UC" followed by 22 url-safe characters. */
function isChannelId(value: string): boolean {
  return /^UC[\w-]{22}$/.test(value)
}

function normalizeHandle(segment: string): string {
  return segment.replace(/^@/, '').trim().toLowerCase()
}
