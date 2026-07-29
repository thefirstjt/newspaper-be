import { test } from '@japa/runner'
import { MockLanguageModelV3 } from 'ai/test'
import { SourceDiscoverer } from '#services/orchestrator/source_discoverer'
import { AgentTask } from '#services/orchestrator/types'

const usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
}

function discovererReturning(responseText: string) {
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
  const discoverer = new SourceDiscoverer((task) => {
    tasks.push(task)
    return model
  })
  return { discoverer, calls, tasks }
}

test.group('SourceDiscoverer.discover', () => {
  test('runs on the generation model and returns the proposed feeds and channels', async ({
    assert,
  }) => {
    const { discoverer, calls, tasks } = discovererReturning(
      '{"feeds": [{"name": "Stripe Engineering", "feedUrl": "https://stripe.com/blog/feed.rss"}], "channels": [{"name": "Veritasium", "channelUrl": "https://www.youtube.com/@veritasium"}]}'
    )

    const result = await discoverer.discover({
      categoryTitle: 'Engineering Blogs',
      relevanceHint: 'Deep engineering writing.',
      persona: 'A senior engineer.',
    })

    assert.deepEqual(tasks, [AgentTask.GENERATION])
    assert.deepEqual(result.feeds, [
      { name: 'Stripe Engineering', feedUrl: 'https://stripe.com/blog/feed.rss' },
    ])
    assert.deepEqual(result.channels, [
      { name: 'Veritasium', channelUrl: 'https://www.youtube.com/@veritasium' },
    ])

    // The category and persona are described to the model.
    const userMessage = calls[0].prompt.find((message: any) => message.role === 'user')
    const text = userMessage.content.map((part: any) => part.text).join('\n')
    assert.include(text, 'Engineering Blogs')
    assert.include(text, 'Deep engineering writing.')
    assert.include(text, 'A senior engineer.')
  })
})
