import env from '#start/env'
import type { CategoryConfig, SourceType } from '#config/newspaper'
import { RssFetcher } from '#services/scout/rss_fetcher'
import { YoutubeFetcher } from '#services/scout/youtube_fetcher'
import { XFetcher } from '#services/scout/x_fetcher'
import { XAccountStore } from '#services/scout/x_account_store'
import { SeenUrlStore } from '#services/scout/seen_url_store'
import { canonicalizeUrl, hashUrl } from '#services/scout/url'
import type {
  RawCandidate,
  ScoutFailure,
  ScoutResult,
  ScoutedCandidate,
  SeenUrlGate,
  SourceFetcher,
} from '#services/scout/types'

/**
 * Gathers the day's candidate stories. For each configured source it picks the
 * matching fetcher, collects what it finds, then dedupes across the whole run
 * and drops anything the reader has already seen. A source that has no fetcher
 * (a deferred type such as web search) is skipped, and a source that fails to
 * load is recorded rather than aborting the run.
 */
export class Scout {
  constructor(
    private fetchers: Partial<Record<SourceType, SourceFetcher>>,
    private seenUrls: SeenUrlGate
  ) {}

  async scout(categories: CategoryConfig[]): Promise<ScoutResult> {
    const gathered: ScoutedCandidate[] = []
    const failures: ScoutFailure[] = []

    for (const category of categories) {
      for (const source of category.sources) {
        const fetcher = this.fetchers[source.type]
        if (!fetcher) {
          continue
        }

        try {
          const candidates = await fetcher.fetch(source)
          for (const candidate of candidates) {
            gathered.push(toScoutedCandidate(candidate, category.key, source.userAdded ?? false))
          }
        } catch (error) {
          failures.push({ sourceName: source.name, message: messageOf(error) })
        }
      }
    }

    const unique = dedupeByHash(gathered)
    const candidates = await this.seenUrls.filterUnseen(unique)

    return { candidates, failures }
  }
}

/**
 * Builds a scout for one reader with the fetchers the environment can support.
 * RSS always works; YouTube and X are only wired up when their API keys are
 * configured, so sources of those types are simply skipped otherwise. The
 * seen-url and X-account caches are scoped to the reader.
 */
export function createScout(userId: string): Scout {
  const fetchers: Partial<Record<SourceType, SourceFetcher>> = {
    rss: new RssFetcher(),
  }

  const youtubeApiKey = env.get('YOUTUBE_API_KEY')
  if (youtubeApiKey) {
    fetchers.youtube = new YoutubeFetcher(youtubeApiKey)
  }

  const xApiKey = env.get('X_API_KEY')
  if (xApiKey) {
    fetchers.x = new XFetcher(xApiKey, new XAccountStore(userId))
  }

  return new Scout(fetchers, new SeenUrlStore(userId))
}

/**
 * The longest a snippet may be. A snippet is only a short preview used to rank
 * and summarise a candidate, so a few thousand characters is ample. Some feeds
 * (a full-page scrape masquerading as a summary) hand back enormous blobs; left
 * unchecked those overflow the database's snippet column and would take a whole
 * edition's build down with them.
 */
const MAX_SNIPPET_LENGTH = 4000

function toScoutedCandidate(
  candidate: RawCandidate,
  categoryKey: string,
  userAdded: boolean
): ScoutedCandidate {
  const url = canonicalizeUrl(candidate.url)
  return {
    ...candidate,
    url,
    snippet: truncateSnippet(candidate.snippet),
    urlHash: hashUrl(url),
    categoryKey,
    userAdded,
  }
}

/** Trims an over-long snippet down to a preview, adding an ellipsis when it does. */
function truncateSnippet(snippet: string): string {
  if (snippet.length <= MAX_SNIPPET_LENGTH) {
    return snippet
  }
  return `${snippet.slice(0, MAX_SNIPPET_LENGTH).trimEnd()}…`
}

function dedupeByHash(candidates: ScoutedCandidate[]): ScoutedCandidate[] {
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    if (seen.has(candidate.urlHash)) {
      return false
    }
    seen.add(candidate.urlHash)
    return true
  })
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
