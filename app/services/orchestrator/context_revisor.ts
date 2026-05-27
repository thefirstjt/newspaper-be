import { generateText } from 'ai'
import { modelFor } from '#services/orchestrator/models'
import { assertNotEmpty } from '#services/orchestrator/helpers'
import { REVISE_DOCUMENT_SYSTEM_PROMPT } from '#services/orchestrator/prompts'
import { AgentTask } from '#services/orchestrator/types'
import type { ModelResolver, ReviseDocumentInput } from '#services/orchestrator/types'

/**
 * Keeps the living reader documents up to date. Given a document's current
 * contents and a description of what has recently been observed about the
 * reader, it rewrites the document so it absorbs those observations.
 *
 * The model resolver is injectable so tests can supply a mock in place of a
 * real provider.
 */
export class ContextRevisor {
  constructor(private getModelFor: ModelResolver = modelFor) {}

  async revise(input: ReviseDocumentInput): Promise<string> {
    const userMessage = [
      'Current contents of the document:',
      input.currentContent.trim() || '(empty — nothing has been written yet)',
      '',
      'What we have recently observed about the reader:',
      input.observations,
    ].join('\n')

    const { text } = await generateText({
      model: this.getModelFor(AgentTask.GENERATION),
      system: REVISE_DOCUMENT_SYSTEM_PROMPT,
      prompt: userMessage,
      maxOutputTokens: 1024,
    })

    return assertNotEmpty(text)
  }
}
