import env from '#start/env'
import newspaperConfig from '#config/newspaper'
import type { CategoryConfig, SourceType } from '#config/newspaper'
import { RssFetcher } from '#services/scout/rss_fetcher'
import { YoutubeFetcher } from '#services/scout/youtube_fetcher'
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

  async scout(categories: CategoryConfig[] = newspaperConfig.categories): Promise<ScoutResult> {
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
            gathered.push(toScoutedCandidate(candidate, category.key))
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
 * Builds a scout with the fetchers the environment can support. RSS always
 * works; YouTube is only wired up when an API key is configured, so YouTube
 * sources are simply skipped otherwise.
 */
export function createScout(): Scout {
  const fetchers: Partial<Record<SourceType, SourceFetcher>> = {
    rss: new RssFetcher(),
  }

  const youtubeApiKey = env.get('YOUTUBE_API_KEY')
  if (youtubeApiKey) {
    fetchers.youtube = new YoutubeFetcher(youtubeApiKey)
  }

  return new Scout(fetchers, new SeenUrlStore())
}

function toScoutedCandidate(candidate: RawCandidate, categoryKey: string): ScoutedCandidate {
  const url = canonicalizeUrl(candidate.url)
  return { ...candidate, url, urlHash: hashUrl(url), categoryKey }
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
