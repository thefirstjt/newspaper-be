import { generateText } from 'ai'
import { modelFor } from '#services/orchestrator/models'
import { assertNotEmpty } from '#services/orchestrator/helpers'
import { PERSONA_SYSTEM_PROMPT } from '#services/orchestrator/prompts'
import { AgentTask } from '#services/orchestrator/types'
import type { ModelResolver, PersonaInput } from '#services/orchestrator/types'

/**
 * Writes a reader's persona document from the details they gave during
 * onboarding. It describes those details to the model in plain language and asks
 * it to turn them into a rounded picture of the person.
 *
 * The model resolver is injectable so tests can supply a mock in place of a real
 * provider.
 */
export class PersonaBuilder {
  constructor(private getModelFor: ModelResolver = modelFor) {}

  async buildPersona(input: PersonaInput): Promise<string> {
    const { text } = await generateText({
      model: this.getModelFor(AgentTask.GENERATION),
      system: PERSONA_SYSTEM_PROMPT,
      prompt: describeReader(input),
    })

    return assertNotEmpty(text)
  }
}

/** Lays out the reader's onboarding details as a set of plain-language notes. */
function describeReader(input: PersonaInput): string {
  const lines = [
    `Line of work or role: ${input.role}`,
    input.industry ? `Industry: ${input.industry}` : null,
    input.experienceLevel ? `Experience level: ${input.experienceLevel}` : null,
    `Fields they want to learn about: ${input.learningGoals.join(', ')}`,
    input.interests?.length ? `Interests: ${input.interests.join(', ')}` : null,
    input.goals ? `What they want from the newspaper: ${input.goals}` : null,
    input.preferredDepth ? `Preferred depth: ${input.preferredDepth}` : null,
    input.avoid?.length ? `Would rather avoid: ${input.avoid.join(', ')}` : null,
    input.location ? `Location or region: ${input.location}` : null,
  ].filter((line): line is string => line !== null)

  return `Details the reader gave about themselves:\n${lines.map((line) => `- ${line}`).join('\n')}`
}
