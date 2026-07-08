import { SourceDiscoverer } from '#services/orchestrator/source_discoverer'
import { FeedVerifier } from '#services/scout/feed_verifier'
import type {
  DiscoverSourcesInput,
  DiscoveredSource,
} from '#services/orchestrator/source_discoverer'

/**
 * Finds sources for a category and keeps only those whose feeds actually
 * resolve. Kept behind an interface with a swappable factory so the onboarding
 * endpoint can be exercised in tests without a real model or network.
 */
export interface SourceDiscovery {
  discoverVerified(input: DiscoverSourcesInput): Promise<DiscoveredSource[]>
}

/** The real discovery: ask the model, then drop any feed that does not resolve. */
export class LlmSourceDiscovery implements SourceDiscovery {
  constructor(
    private discoverer = new SourceDiscoverer(),
    private verifier = new FeedVerifier()
  ) {}

  async discoverVerified(input: DiscoverSourcesInput): Promise<DiscoveredSource[]> {
    const candidates = await this.discoverer.discover(input)
    const working = new Set(await this.verifier.keepWorking(candidates.map((c) => c.feedUrl)))
    return candidates.filter((candidate) => working.has(candidate.feedUrl))
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
