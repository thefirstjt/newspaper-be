import type { DateTime } from 'luxon'
import type { SourceConfig } from '#config/newspaper'

export type MediaType = 'article' | 'video' | 'podcast'

/**
 * A single item as a fetcher first produces it, before the scout works out
 * which category it belongs to or how to dedupe it.
 */
export interface RawCandidate {
  url: string
  title: string
  snippet: string
  sourceName: string
  author: string | null
  publishedAt: DateTime | null
  mediaType: MediaType
}

/**
 * A candidate ready for the rest of the pipeline: tied to a category, with its
 * url canonicalised and hashed for deduplication and the seen-url store.
 */
export interface ScoutedCandidate extends RawCandidate {
  categoryKey: string
  urlHash: string
}

/** A source the scout could not read, kept so a run can report what it missed. */
export interface ScoutFailure {
  sourceName: string
  message: string
}

export interface ScoutResult {
  candidates: ScoutedCandidate[]
  failures: ScoutFailure[]
}

/** Reads one source and normalises its items into raw candidates. */
export interface SourceFetcher {
  fetch(source: SourceConfig): Promise<RawCandidate[]>
}

/** Drops candidates whose url has already been shown to or rated by the reader. */
export interface SeenUrlGate {
  filterUnseen(candidates: ScoutedCandidate[]): Promise<ScoutedCandidate[]>
}

/**
 * Remembers the numeric X user id behind a handle so it only has to be resolved
 * from the API once. `lookup` returns null when the handle has not been seen
 * before, in which case the caller resolves it and calls `remember`.
 */
export interface XAccountCache {
  lookup(username: string): Promise<string | null>
  remember(username: string, userId: string): Promise<void>
}
