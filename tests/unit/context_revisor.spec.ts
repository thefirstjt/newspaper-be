import { test } from '@japa/runner'
import { MockLanguageModelV3 } from 'ai/test'
import { ContextRevisor } from '#services/orchestrator/context_revisor'
import { AgentTask } from '#services/orchestrator/types'

const usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
}

function revisorReturning(responseText: string) {
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
  const revisor = new ContextRevisor((task) => {
    tasks.push(task)
    return model
  })
  return { revisor, calls, tasks }
}

test.group('ContextRevisor.revise', () => {
  test('runs on the generation model with the current content and observations', async ({
    assert,
  }) => {
    const { revisor, calls, tasks } = revisorReturning('The reader likes distributed systems.')
    const revised = await revisor.revise({
      currentContent: 'Nothing learned yet.',
      observations: 'Rated a Kafka deep-dive 5 stars; discarded a crypto-price story.',
    })

    assert.deepEqual(tasks, [AgentTask.GENERATION])
    const userMessage = calls[0].prompt.find((message: any) => message.role === 'user')
    assert.include(userMessage.content[0].text, 'Nothing learned yet.')
    assert.include(userMessage.content[0].text, 'Kafka deep-dive')
    assert.equal(revised, 'The reader likes distributed systems.')
  })
})
