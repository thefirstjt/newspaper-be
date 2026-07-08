import { test } from '@japa/runner'
import { MockLanguageModelV3 } from 'ai/test'
import { PersonaBuilder } from '#services/orchestrator/persona_builder'
import { AgentTask } from '#services/orchestrator/types'

const usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
}

function builderReturning(responseText: string) {
  const calls: any[] = []
  const tasks: AgentTask[] = []
  const model = new MockLanguageModelV3({
    doGenerate: async (options) => {
      calls.push(options)
      return {
        content: [{ type: 'text' as const, text: responseText }],
        finishReason: { unified: 'stop' as const, raw: 'stop' },
        usage,
        warnings: [],
      }
    },
  })
  const builder = new PersonaBuilder((task) => {
    tasks.push(task)
    return model
  })
  return { builder, calls, tasks }
}

test.group('PersonaBuilder.buildPersona', () => {
  test('runs on the generation model with the reader details and returns the persona', async ({
    assert,
  }) => {
    const { builder, calls, tasks } = builderReturning('A senior engineer who loves systems.')

    const persona = await builder.buildPersona({
      role: 'Software engineer',
      industry: 'Fintech',
      learningGoals: ['distributed systems', 'AI integrations'],
      interests: ['databases'],
      goals: 'Stay sharp and keep learning',
    })

    assert.deepEqual(tasks, [AgentTask.GENERATION])
    const userMessage = calls[0].prompt.find((message: any) => message.role === 'user')
    const text = userMessage.content[0].text
    assert.include(text, 'Software engineer')
    assert.include(text, 'Fintech')
    assert.include(text, 'distributed systems')
    assert.include(text, 'Stay sharp and keep learning')
    assert.equal(persona, 'A senior engineer who loves systems.')
  })

  test('omits fields that were not provided', async ({ assert }) => {
    const { builder, calls } = builderReturning('Persona.')

    await builder.buildPersona({ role: 'Designer', learningGoals: ['typography'] })

    const userMessage = calls[0].prompt.find((message: any) => message.role === 'user')
    const text = userMessage.content[0].text
    assert.include(text, 'Designer')
    assert.include(text, 'typography')
    assert.notInclude(text, 'Industry:')
    assert.notInclude(text, 'Interests:')
  })
})
