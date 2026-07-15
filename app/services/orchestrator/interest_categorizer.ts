import { generateText, Output } from 'ai'
import { modelFor } from '#services/orchestrator/models'
import { interestCategoriesSchema } from '#services/orchestrator/schemas'
import { buildMessageUsingContext } from '#services/orchestrator/helpers'
import { INTEREST_CATEGORIZATION_SYSTEM_PROMPT } from '#services/orchestrator/prompts'
import { AgentTask } from '#services/orchestrator/types'
import type { ModelResolver } from '#services/orchestrator/types'

/** One category the model derives from a reader's free-text interests. */
export interface CategoryPlan {
  title: string
  description: string
}

/**
 * Turns a reader's free-text description of their interests into a small set of
 * coherent newspaper categories. Used in onboarding when the reader would rather
 * describe what they care about than name categories one by one.
 *
 * The model resolver is injectable so tests can supply a mock in place of a real
 * provider.
 */
export class InterestCategorizer {
  constructor(private getModelFor: ModelResolver = modelFor) {}

  /**
   * Groups the reader's free-text interests into categories, tailoring them to
   * the reader's persona when one is provided.
   */
  async categorize(interests: string, persona = ''): Promise<CategoryPlan[]> {
    const userMessage = `The reader describes their interests as:\n${interests}`

    const { output } = await generateText({
      model: this.getModelFor(AgentTask.GENERATION),
      system: INTEREST_CATEGORIZATION_SYSTEM_PROMPT,
      messages: buildMessageUsingContext(persona, userMessage),
      output: Output.object({ schema: interestCategoriesSchema }),
    })

    return output.categories
  }
}
