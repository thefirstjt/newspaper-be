import { generateText, Output } from 'ai'
import { modelFor } from '#services/orchestrator/models'
import { sourceDiscoverySchema } from '#services/orchestrator/schemas'
import { buildMessageUsingContext } from '#services/orchestrator/helpers'
import { SOURCE_DISCOVERY_SYSTEM_PROMPT } from '#services/orchestrator/prompts'
import { AgentTask } from '#services/orchestrator/types'
import type { ModelResolver } from '#services/orchestrator/types'

export interface DiscoverSourcesInput {
  categoryTitle: string
  /** What makes a source relevant to this category. */
  relevanceHint: string
  /** The reader's persona, to tailor the suggestions (may be empty). */
  persona?: string
  /** Roughly how many sources to propose. */
  limit?: number
}

/** A feed-backed source the model proposes, before its feed is verified. */
export interface DiscoveredFeed {
  name: string
  feedUrl: string
}

/** A YouTube channel the model proposes, before it is resolved. */
export interface DiscoveredChannel {
  name: string
  channelUrl: string
}

/** What the model proposes for a category: feeds and channels, both unverified. */
export interface DiscoveryResult {
  feeds: DiscoveredFeed[]
  channels: DiscoveredChannel[]
}

/**
 * Asks the model to suggest good sources for a category — RSS/Atom feeds and
 * YouTube channels — optionally tailored to the reader. The suggestions still
 * need verifying (the model can propose feeds that do not resolve or channels
 * that do not exist), so callers should check each one before trusting it.
 *
 * The model resolver is injectable so tests can supply a mock in place of a real
 * provider.
 */
export class SourceDiscoverer {
  constructor(private getModelFor: ModelResolver = modelFor) {}

  async discover(input: DiscoverSourcesInput): Promise<DiscoveryResult> {
    const userMessage = [
      `Section: ${input.categoryTitle}`,
      '',
      'What the reader wants from this section:',
      input.relevanceHint,
      '',
      `Suggest up to ${input.limit ?? 6} sources.`,
    ].join('\n')

    const { output } = await generateText({
      model: this.getModelFor(AgentTask.GENERATION),
      system: SOURCE_DISCOVERY_SYSTEM_PROMPT,
      messages: buildMessageUsingContext(input.persona ?? '', userMessage),
      output: Output.object({ schema: sourceDiscoverySchema }),
    })

    return { feeds: output.feeds, channels: output.channels }
  }
}
