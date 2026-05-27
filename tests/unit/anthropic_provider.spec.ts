import { test } from '@japa/runner'
import type Anthropic from '@anthropic-ai/sdk'
import { AnthropicProvider } from '#services/llm/anthropic_provider'
import { RANKING_SYSTEM_PROMPT } from '#services/llm/prompts'
import type { LlmModels } from '#services/llm/types'

const models: LlmModels = {
  ranking: 'rank-model',
  summary: 'summary-model',
  generation: 'generation-model',
}

const readerContext = '# About the reader\n\n## Who the reader is\n\nEnjoys distributed systems.'

/**
 * Builds a provider backed by a fake Anthropic client. The fake records the
 * request it was given and returns whatever text blocks the test supplies, so
 * no real API call is ever made.
 */
function providerReturning(responseText: string) {
  const calls: any[] = []
  const client = {
    messages: {
      create: async (params: any) => {
        calls.push(params)
        return { content: responseText === '' ? [] : [{ type: 'text', text: responseText }] }
      },
    },
  } as unknown as Anthropic

  return { provider: new AnthropicProvider(client, models), calls }
}

test.group('AnthropicProvider.rankCandidates', () => {
  const input = {
    categoryTitle: 'Engineering Blogs',
    relevanceHint: 'Deep system design writing.',
    readerContext,
    candidates: [
      { id: 1, title: 'A', snippet: 'a', sourceName: 'Src' },
      { id: 2, title: 'B', snippet: 'b', sourceName: 'Src' },
    ],
  }

  test('uses the ranking model and constrains output with a json schema', async ({ assert }) => {
    const { provider, calls } = providerReturning('{"rankings": []}')
    await provider.rankCandidates(input)

    assert.equal(calls[0].model, 'rank-model')
    assert.equal(calls[0].output_config.format.type, 'json_schema')
    assert.property(calls[0].output_config.format.schema.properties, 'rankings')
  })

  test('uses the task-only ranking system prompt with no reader baked in', async ({ assert }) => {
    const { provider, calls } = providerReturning('{"rankings": []}')
    await provider.rankCandidates(input)

    assert.equal(calls[0].system[0].text, RANKING_SYSTEM_PROMPT)
  })

  test('injects the reader context as a cached leading user block', async ({ assert }) => {
    const { provider, calls } = providerReturning('{"rankings": []}')
    await provider.rankCandidates(input)

    const content = calls[0].messages[0].content
    assert.equal(content[0].text, readerContext)
    assert.deepEqual(content[0].cache_control, { type: 'ephemeral' })
    // The volatile candidates live in a later block, after the cached prefix.
    assert.include(content[1].text, 'Candidates:')
    assert.notProperty(content[1], 'cache_control')
  })

  test('returns the rankings sorted by score, highest first', async ({ assert }) => {
    const { provider } = providerReturning(
      '{"rankings": [{"id": 1, "score": 0.3, "reason": "ok"}, {"id": 2, "score": 0.9, "reason": "great"}]}'
    )
    const ranked = await provider.rankCandidates(input)

    assert.deepEqual(
      ranked.map((item) => item.id),
      [2, 1]
    )
  })

  test('throws when the model returns invalid json', async ({ assert }) => {
    const { provider } = providerReturning('not json at all')
    await assert.rejects(() => provider.rankCandidates(input), /not valid JSON/)
  })
})

test.group('AnthropicProvider.summarize', () => {
  test('uses the summary model, sends no schema or reader context, and trims text', async ({
    assert,
  }) => {
    const { provider, calls } = providerReturning('  A concise summary.  ')
    const summary = await provider.summarize({
      title: 'Title',
      sourceName: 'Source',
      content: 'Long article body.',
    })

    assert.equal(calls[0].model, 'summary-model')
    assert.isUndefined(calls[0].output_config)
    // Only the article block — summaries are reader-neutral.
    assert.lengthOf(calls[0].messages[0].content, 1)
    assert.equal(summary, 'A concise summary.')
  })

  test('throws when the model returns an empty response', async ({ assert }) => {
    const { provider } = providerReturning('')
    await assert.rejects(
      () => provider.summarize({ title: 'T', sourceName: 'S', content: 'C' }),
      /empty response/
    )
  })
})

test.group('AnthropicProvider.generateQuiz', () => {
  test('uses the generation model and returns the parsed questions', async ({ assert }) => {
    const question = {
      topic: 'system design',
      question: 'Q?',
      options: ['a', 'b', 'c', 'd'],
      correctIndex: 2,
      explanation: 'because',
    }
    const { provider, calls } = providerReturning(JSON.stringify({ questions: [question] }))

    const quiz = await provider.generateQuiz({
      gapTopics: ['system design'],
      count: 1,
      readerContext,
    })

    assert.equal(calls[0].model, 'generation-model')
    assert.equal(calls[0].output_config.format.type, 'json_schema')
    assert.equal(calls[0].messages[0].content[0].text, readerContext)
    assert.deepEqual(quiz, [question])
  })
})

test.group('AnthropicProvider.generateKeyLearning', () => {
  test('uses the generation model and returns plain text', async ({ assert }) => {
    const { provider, calls } = providerReturning('An insight about replication.')
    const learning = await provider.generateKeyLearning({
      gapTopics: ['data-intensive applications'],
      readerContext,
    })

    assert.equal(calls[0].model, 'generation-model')
    assert.equal(calls[0].messages[0].content[0].text, readerContext)
    assert.equal(learning, 'An insight about replication.')
  })
})

test.group('AnthropicProvider.reviseDocument', () => {
  test('uses the generation model and sends current content plus observations', async ({
    assert,
  }) => {
    const { provider, calls } = providerReturning('The reader likes distributed systems.')
    const revised = await provider.reviseDocument({
      currentContent: 'Nothing learned yet.',
      observations: 'Rated a Kafka deep-dive 5 stars; discarded a crypto-price story.',
    })

    assert.equal(calls[0].model, 'generation-model')
    const userText = calls[0].messages[0].content[0].text
    assert.include(userText, 'Nothing learned yet.')
    assert.include(userText, 'Kafka deep-dive')
    assert.equal(revised, 'The reader likes distributed systems.')
  })
})
