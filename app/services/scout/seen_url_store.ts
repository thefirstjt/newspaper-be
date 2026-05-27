import { DateTime } from 'luxon'
import SeenUrl from '#models/seen_url'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { ScoutedCandidate, SeenUrlGate } from '#services/scout/types'

/**
 * The permanent record of every url already shown to or rated by the reader.
 * The scout uses it to drop stories that have come around before; the edition
 * builder adds to it when an item is surfaced.
 */
export class SeenUrlStore implements SeenUrlGate {
  async filterUnseen(candidates: ScoutedCandidate[]): Promise<ScoutedCandidate[]> {
    if (candidates.length === 0) {
      return []
    }

    const hashes = candidates.map((candidate) => candidate.urlHash)
    const seen = await SeenUrl.query().whereIn('url_hash', hashes)
    const seenHashes = new Set(seen.map((row) => row.urlHash))

    return candidates.filter((candidate) => !seenHashes.has(candidate.urlHash))
  }

  /**
   * Records the given candidates as seen, skipping any already on record. A
   * transaction client can be passed so the write is part of a larger unit of
   * work (such as saving an edition).
   */
  async markSeen(
    candidates: ScoutedCandidate[],
    client?: TransactionClientContract
  ): Promise<void> {
    if (candidates.length === 0) {
      return
    }

    const hashes = candidates.map((candidate) => candidate.urlHash)
    const existing = await SeenUrl.query({ client }).whereIn('url_hash', hashes)
    const existingHashes = new Set(existing.map((row) => row.urlHash))

    const rows = candidates
      .filter((candidate) => !existingHashes.has(candidate.urlHash))
      .map((candidate) => ({
        urlHash: candidate.urlHash,
        url: candidate.url,
        firstSeenAt: DateTime.now(),
      }))

    if (rows.length > 0) {
      await SeenUrl.createMany(dedupeByHash(rows), { client })
    }
  }
}

function dedupeByHash<T extends { urlHash: string }>(rows: T[]): T[] {
  const seen = new Set<string>()
  return rows.filter((row) => {
    if (seen.has(row.urlHash)) {
      return false
    }
    seen.add(row.urlHash)
    return true
  })
}
