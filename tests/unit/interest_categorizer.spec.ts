import { test } from '@japa/runner'
import { MockLanguageModelV3 } from 'ai/test'
import { InterestCategorizer } from '#services/orchestrator/interest_categorizer'
import { AgentTask } from '#services/orchestrator/types'

const usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
}

function categorizerReturning(responseText: string) {
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
  const categorizer = new InterestCategorizer((task) => {
    tasks.push(task)
    return model
  })
  return { categorizer, calls, tasks }
}

test.group('InterestCategorizer.categorize', () => {
  test('runs on the generation model and returns the derived categories', async ({ assert }) => {
    const { categorizer, calls, tasks } = categorizerReturning(
      '{"categories": [{"title": "Engineering & Systems", "description": "Deep engineering writing."}]}'
    )

    const categories = await categorizer.categorize(
      'I love distributed systems, databases, and how big software is built.'
    )

    assert.deepEqual(tasks, [AgentTask.GENERATION])
    assert.deepEqual(categories, [
      { title: 'Engineering & Systems', description: 'Deep engineering writing.' },
    ])

    const userMessage = calls[0].prompt.find((message: any) => message.role === 'user')
    assert.include(userMessage.content[0].text, 'distributed systems')
  })
})
