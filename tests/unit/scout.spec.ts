import { test } from '@japa/runner'
import { Scout } from '#services/scout/scout'
import type { CategoryConfig, SourceConfig } from '#config/newspaper'
import type { RawCandidate, ScoutedCandidate, SourceFetcher } from '#services/scout/types'

function rawCandidate(url: string): RawCandidate {
  return {
    url,
    title: 'Title',
    snippet: 'Snippet',
    sourceName: 'Source',
    author: null,
    publishedAt: null,
    mediaType: 'article',
  }
}

/** An RSS-shaped fetcher that returns canned candidates keyed by source name. */
function fetcherFrom(bySource: Record<string, string[]>): SourceFetcher {
  return {
    fetch: async (source: SourceConfig) => (bySource[source.name] ?? []).map(rawCandidate),
  }
}

const passThroughGate = {
  filterUnseen: async (candidates: ScoutedCandidate[]) => candidates,
}

function category(key: string, sources: SourceConfig[]): CategoryConfig {
  return { key, title: key, min: 1, max: 2, poolSize: 6, relevanceHint: '', sources }
}

test.group('Scout', () => {
  test('tags candidates with their category and dedupes by url across sources', async ({
    assert,
  }) => {
    const categories = [
      category('cat-a', [
        { type: 'rss', name: 'S1', settings: { feedUrl: 'f1' } },
        { type: 'websearch', name: 'W', settings: { query: 'q' } },
      ]),
      category('cat-b', [{ type: 'rss', name: 'S2', settings: { feedUrl: 'f2' } }]),
    ]
    const fetchers = {
      rss: fetcherFrom({
        S1: ['https://dup.com/1', 'https://a.com/1'],
        S2: ['https://dup.com/1'],
      }),
    }

    const { candidates, failures } = await new Scout(fetchers, passThroughGate).scout(categories)

    assert.isEmpty(failures)
    assert.deepEqual(candidates.map((candidate) => candidate.url).sort(), [
      'https://a.com/1',
      'https://dup.com/1',
    ])
    // The duplicate keeps the category from its first sighting (cat-a / S1).
    const duplicate = candidates.find((candidate) => candidate.url === 'https://dup.com/1')
    assert.equal(duplicate?.categoryKey, 'cat-a')
  })

  test('carries the source user-added flag onto its candidates', async ({ assert }) => {
    const categories = [
      category('cat-a', [
        { type: 'rss', name: 'Mine', userAdded: true, settings: { feedUrl: 'f1' } },
        { type: 'rss', name: 'Default', settings: { feedUrl: 'f2' } },
      ]),
    ]
    const fetchers = {
      rss: fetcherFrom({ Mine: ['https://mine.com/1'], Default: ['https://default.com/1'] }),
    }

    const { candidates } = await new Scout(fetchers, passThroughGate).scout(categories)

    const mine = candidates.find((candidate) => candidate.url === 'https://mine.com/1')
    const other = candidates.find((candidate) => candidate.url === 'https://default.com/1')
    assert.isTrue(mine?.userAdded)
    // A source with no userAdded flag defaults to false.
    assert.isFalse(other?.userAdded)
  })

  test('skips source types that have no fetcher without recording a failure', async ({
    assert,
  }) => {
    const categories = [
      category('cat-a', [{ type: 'websearch', name: 'W', settings: { query: 'q' } }]),
    ]

    const { candidates, failures } = await new Scout({}, passThroughGate).scout(categories)

    assert.isEmpty(candidates)
    assert.isEmpty(failures)
  })

  test('records a failure when a source cannot be read and carries on', async ({ assert }) => {
    const categories = [
      category('cat-a', [
        { type: 'rss', name: 'Broken', settings: { feedUrl: 'f1' } },
        { type: 'rss', name: 'Working', settings: { feedUrl: 'f2' } },
      ]),
    ]
    const fetchers = {
      rss: {
        fetch: async (source: SourceConfig) => {
          if (source.name === 'Broken') {
            throw new Error('network down')
          }
          return [rawCandidate('https://ok.com/1')]
        },
      },
    }

    const { candidates, failures } = await new Scout(fetchers, passThroughGate).scout(categories)

    assert.lengthOf(candidates, 1)
    assert.lengthOf(failures, 1)
    assert.equal(failures[0].sourceName, 'Broken')
    assert.include(failures[0].message, 'network down')
  })

  test('drops candidates the seen-url gate filters out', async ({ assert }) => {
    const categories = [
      category('cat-a', [{ type: 'rss', name: 'S1', settings: { feedUrl: 'f1' } }]),
    ]
    const fetchers = { rss: fetcherFrom({ S1: ['https://seen.com/1', 'https://fresh.com/1'] }) }
    const gate = {
      filterUnseen: async (candidates: ScoutedCandidate[]) =>
        candidates.filter((candidate) => candidate.url !== 'https://seen.com/1'),
    }

    const { candidates } = await new Scout(fetchers, gate).scout(categories)

    assert.deepEqual(
      candidates.map((candidate) => candidate.url),
      ['https://fresh.com/1']
    )
  })
})
