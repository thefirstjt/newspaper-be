import Parser from 'rss-parser'
import { DateTime } from 'luxon'
import type { SourceConfig } from '#config/newspaper'
import type { MediaType, RawCandidate, SourceFetcher } from '#services/scout/types'

/** How many of a feed's most recent entries to take. Feeds are newest-first. */
const MAX_ITEMS = 10

/** How long to wait for a feed before giving up, so one slow source can't stall a run. */
const REQUEST_TIMEOUT_MS = 10_000

type FeedReader = Pick<Parser, 'parseURL'>

/**
 * Reads an RSS or Atom feed and turns its recent entries into candidates. The
 * parser is injectable so tests can supply a canned feed instead of making a
 * network request.
 */
export class RssFetcher implements SourceFetcher {
  constructor(private parser: FeedReader = new Parser({ timeout: REQUEST_TIMEOUT_MS })) {}

  async fetch(source: SourceConfig): Promise<RawCandidate[]> {
    const feedUrl = source.settings.feedUrl
    if (!feedUrl) {
      throw new Error(`RSS source "${source.name}" has no feedUrl configured.`)
    }

    const feed = await this.parser.parseURL(feedUrl)

    return feed.items
      .filter((item) => item.link)
      .slice(0, MAX_ITEMS)
      .map((item) => ({
        url: item.link!,
        title: (item.title ?? '').trim(),
        snippet: (item.contentSnippet ?? item.content ?? '').trim(),
        sourceName: source.name,
        author: item.creator?.trim() || null,
        publishedAt: parseDate(item.isoDate ?? item.pubDate),
        mediaType: mediaTypeOf(item),
      }))
  }
}

function mediaTypeOf(item: Parser.Item): MediaType {
  return item.enclosure?.type?.startsWith('audio') ? 'podcast' : 'article'
}

function parseDate(value: string | undefined): DateTime | null {
  if (!value) {
    return null
  }
  const parsed = DateTime.fromISO(value)
  return parsed.isValid ? parsed : null
}
