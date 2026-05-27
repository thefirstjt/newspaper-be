import { test } from '@japa/runner'
import { MockLanguageModelV3 } from 'ai/test'
import { HeadlineManager } from '#services/orchestrator/headline_manager'
import { RANKING_SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT } from '#services/orchestrator/prompts'
import { AgentTask } from '#services/orchestrator/types'

const readerContext = '# About the reader\n\n## Who the reader is\n\nEnjoys distributed systems.'

const usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
}

/**
 * Builds a HeadlineManager whose model is a mock that records the call options
 * it receives and returns the supplied text, so the manager can be exercised
 * with no real network calls. The resolver also records which task asked for a
 * model, so routing can be asserted.
 */
function managerReturning(responseText: string) {
  const calls: any[] = []
  const tasks: AgentTask[] = []
  const model = new MockLanguageModelV3({
    doGenerate: async (options) => {
      calls.push(options)
      return {
        content: responseText === '' ? [] : [{ type: 'text' as const, text: responseText }],
        finishReason: { unified: 'stop' as const, raw: 'stop' },
        usage,
        warnings: [],
      }
    },
  })
  const manager = new HeadlineManager((task) => {
    tasks.push(task)
    return model
  })
  return { manager, calls, tasks }
}

function userMessageOf(calls: any[]) {
  return calls[0].prompt.find((message: any) => message.role === 'user')
}

function systemTextOf(calls: any[]) {
  return calls[0].prompt.find((message: any) => message.role === 'system')?.content
}

test.group('HeadlineManager.rankCandidates', () => {
  const input = {
    categoryTitle: 'Engineering Blogs',
    relevanceHint: 'Deep system design writing.',
    readerContext,
    candidates: [
      { id: 1, title: 'A', snippet: 'a', sourceName: 'Src' },
      { id: 2, title: 'B', snippet: 'b', sourceName: 'Src' },
    ],
  }

  test('runs on the ranking model and returns rankings ordered best first', async ({ assert }) => {
    const { manager, tasks } = managerReturning(
      '{"rankings": [{"id": 1, "score": 0.3, "reason": "ok"}, {"id": 2, "score": 0.9, "reason": "great"}]}'
    )
    const ranked = await manager.rankCandidates(input)

    assert.deepEqual(tasks, [AgentTask.RANKING])
    assert.deepEqual(
      ranked.map((item) => item.id),
      [2, 1]
    )
  })

  test('uses the task-only system prompt with no reader baked in', async ({ assert }) => {
    const { manager, calls } = managerReturning('{"rankings": []}')
    await manager.rankCandidates(input)

    assert.equal(systemTextOf(calls), RANKING_SYSTEM_PROMPT)
  })

  test('injects the reader context as a cached leading user block', async ({ assert }) => {
    const { manager, calls } = managerReturning('{"rankings": []}')
    await manager.rankCandidates(input)

    const content = userMessageOf(calls).content
    assert.equal(content[0].text, readerContext)
    assert.deepEqual(content[0].providerOptions.anthropic.cacheControl, { type: 'ephemeral' })
    assert.include(content[1].text, 'Candidates:')
    assert.isUndefined(content[1].providerOptions)
  })
})

test.group('HeadlineManager.summarizeArticle', () => {
  test('runs on the summary model, stays reader-neutral, and trims the text', async ({
    assert,
  }) => {
    const { manager, calls, tasks } = managerReturning('  A concise summary.  ')
    const summary = await manager.summarizeArticle({
      title: 'Title',
      sourceName: 'Source',
      content: 'Long article body.',
    })

    assert.deepEqual(tasks, [AgentTask.SUMMARY])
    assert.equal(systemTextOf(calls), SUMMARY_SYSTEM_PROMPT)
    assert.lengthOf(userMessageOf(calls).content, 1)
    assert.equal(summary, 'A concise summary.')
  })

  test('throws when the model returns an empty response', async ({ assert }) => {
    const { manager } = managerReturning('')
    await assert.rejects(
      () => manager.summarizeArticle({ title: 'T', sourceName: 'S', content: 'C' }),
      /empty response/
    )
  })
})

test.group('HeadlineManager.writeQuiz', () => {
  test('runs on the generation model and returns the parsed questions', async ({ assert }) => {
    const question = {
      topic: 'system design',
      question: 'Q?',
      options: ['a', 'b', 'c', 'd'],
      correctIndex: 2,
      explanation: 'because',
    }
    const { manager, calls, tasks } = managerReturning(JSON.stringify({ questions: [question] }))

    const quiz = await manager.writeQuiz({ gapTopics: ['system design'], count: 1, readerContext })

    assert.deepEqual(tasks, [AgentTask.GENERATION])
    assert.deepEqual(quiz, [question])
    assert.equal(userMessageOf(calls).content[0].text, readerContext)
  })
})

test.group('HeadlineManager.writeKeyLearning', () => {
  test('runs on the generation model and returns plain text', async ({ assert }) => {
    const { manager, calls, tasks } = managerReturning('An insight about replication.')
    const learning = await manager.writeKeyLearning({
      gapTopics: ['data-intensive applications'],
      readerContext,
    })

    assert.deepEqual(tasks, [AgentTask.GENERATION])
    assert.equal(userMessageOf(calls).content[0].text, readerContext)
    assert.equal(learning, 'An insight about replication.')
  })
})
