import { DateTime } from 'luxon'
import type { SourceConfig } from '#config/newspaper'
import type { RawCandidate, SourceFetcher, XAccountCache } from '#services/scout/types'

const API_BASE = 'https://api.x.com/2'

/** How many of the account's most recent posts to take. Posts are newest-first. */
const MAX_RESULTS = 10

/** How long to wait for the API before giving up, so one slow call can't stall a run. */
const REQUEST_TIMEOUT_MS = 10_000

/** How long a synthesised title may run before it is trimmed. */
const TITLE_LENGTH = 100

interface UserLookupResponse {
  data?: { id?: string }
}

interface Tweet {
  id: string
  text?: string
  created_at?: string
  author_id?: string
  entities?: {
    urls?: Array<{ expanded_url?: string }>
  }
  referenced_tweets?: Array<{ type: string; id: string }>
}

interface TweetAuthor {
  id: string
  name?: string
  username?: string
}

interface TimelineResponse {
  data?: Tweet[]
  includes?: {
    tweets?: Tweet[]
    users?: TweetAuthor[]
  }
}

/**
 * Reads an X (Twitter) account's recent posts and turns them into candidates.
 * The first time it sees a handle it resolves the handle to its numeric user id
 * through the API and remembers it via the account cache, so later runs skip
 * that lookup.
 *
 * Replies are left out, but retweets are kept, since a retweet is a deliberate
 * "this is worth your attention". When a post is a retweet we follow it to the
 * original and use that post's words and links, rather than the truncated
 * "RT @…" stub. When a post shares a link, the candidate points at the shared
 * link itself while the post's own text becomes the snippet — so the link is
 * judged for relevance by what the account said around it, and if it is picked
 * the reader is taken to the link rather than to the post.
 *
 * The fetch implementation is injectable so tests can return canned responses
 * without making a network request.
 */
export class XFetcher implements SourceFetcher {
  constructor(
    private apiKey: string,
    private accounts: XAccountCache,
    private fetchImpl: typeof fetch = fetch
  ) {}

  async fetch(source: SourceConfig): Promise<RawCandidate[]> {
    const username = source.settings.username?.replace(/^@/, '').trim()
    if (!username) {
      throw new Error(`X source "${source.name}" has no username configured.`)
    }

    const userId = await this.resolveUserId(username, source.name)
    const timeline = await this.recentPosts(userId, source.name)

    const originalsById = indexById(timeline.includes?.tweets)
    const authorsById = indexById(timeline.includes?.users)

    return (timeline.data ?? []).map((post) => {
      const retweetOf = post.referenced_tweets?.find((reference) => reference.type === 'retweeted')
      const original = retweetOf ? originalsById.get(retweetOf.id) : undefined
      const effective = original ?? post
      const retweetedFrom = original ? authorsById.get(original.author_id ?? '') : undefined

      const text = (effective.text ?? '').trim()
      const links = externalLinks(effective.entities?.urls)

      return {
        url: links[0] ?? statusUrl(effective, retweetedFrom, username, post),
        title: titleFrom(text) || `Post by ${source.name}`,
        snippet: describePost(text, links, retweetedFrom),
        sourceName: source.name,
        author: retweetedFrom?.name ?? source.name,
        publishedAt: parseDate(effective.created_at ?? post.created_at),
        mediaType: 'article' as const,
      }
    })
  }

  /** Returns the account's numeric id, using the cache first and the API only when it has to. */
  private async resolveUserId(username: string, sourceName: string): Promise<string> {
    const cached = await this.accounts.lookup(username)
    if (cached) {
      return cached
    }

    const response = await this.request(
      `${API_BASE}/users/by/username/${encodeURIComponent(username)}`,
      sourceName
    )
    const body = (await response.json()) as UserLookupResponse
    const userId = body.data?.id
    if (!userId) {
      throw new Error(
        `X source "${sourceName}" could not be resolved to a user — does @${username} exist?`
      )
    }

    await this.accounts.remember(username, userId)
    return userId
  }

  private async recentPosts(userId: string, sourceName: string): Promise<TimelineResponse> {
    const url = new URL(`${API_BASE}/users/${userId}/tweets`)
    url.searchParams.set('max_results', String(MAX_RESULTS))
    url.searchParams.set('exclude', 'replies')
    url.searchParams.set('tweet.fields', 'created_at,entities,author_id,referenced_tweets')
    // Bring the original post (and its author) inline for any retweets.
    url.searchParams.set('expansions', 'referenced_tweets.id,referenced_tweets.id.author_id')

    const response = await this.request(url.toString(), sourceName)
    return (await response.json()) as TimelineResponse
  }

  private async request(url: string, sourceName: string): Promise<Response> {
    const response = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`X request for "${sourceName}" failed with status ${response.status}.`)
    }
    return response
  }
}

/** Indexes tweets or users by their id for quick lookup of expanded references. */
function indexById<T extends { id: string }>(items: T[] | undefined): Map<string, T> {
  return new Map((items ?? []).map((item) => [item.id, item]))
}

/** Pulls out the links an account shared, dropping X's own self-links to a post. */
function externalLinks(urls: Array<{ expanded_url?: string }> | undefined): string[] {
  return (urls ?? [])
    .map((entry) => entry.expanded_url)
    .filter((link): link is string => Boolean(link))
    .filter((link) => !/^https?:\/\/(www\.)?(x|twitter)\.com\//i.test(link))
}

/** The url of the post itself, used when it shares no external link to point at. */
function statusUrl(
  effective: Tweet,
  retweetedFrom: TweetAuthor | undefined,
  username: string,
  post: Tweet
): string {
  if (retweetedFrom?.username) {
    return `https://x.com/${retweetedFrom.username}/status/${effective.id}`
  }
  return `https://x.com/${username}/status/${post.id}`
}

/** Builds a short, single-line title from a post's text. */
function titleFrom(text: string): string {
  const firstLine =
    text
      .split('\n')
      .find((line) => line.trim().length > 0)
      ?.trim() ?? ''
  if (firstLine.length <= TITLE_LENGTH) {
    return firstLine
  }
  return `${firstLine.slice(0, TITLE_LENGTH).trimEnd()}…`
}

/**
 * Keeps the full post text as the snippet, noting whose post it is when it is a
 * retweet and listing any shared links, so the ranker can weigh them.
 */
function describePost(
  text: string,
  links: string[],
  retweetedFrom: TweetAuthor | undefined
): string {
  const parts: string[] = []
  if (retweetedFrom?.username) {
    parts.push(`Retweeted from @${retweetedFrom.username}:`)
  }
  if (text) {
    parts.push(text)
  }
  if (links.length > 0) {
    parts.push(`Shared links: ${links.join(', ')}`)
  }
  return parts.join('\n\n')
}

function parseDate(value: string | undefined): DateTime | null {
  if (!value) {
    return null
  }
  const parsed = DateTime.fromISO(value)
  return parsed.isValid ? parsed : null
}
