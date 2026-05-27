import type Anthropic from '@anthropic-ai/sdk'
import {
  KEY_LEARNING_SYSTEM_PROMPT,
  QUIZ_SYSTEM_PROMPT,
  RANKING_SYSTEM_PROMPT,
  REVISE_DOCUMENT_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
} from '#services/llm/prompts'
import type {
  KeyLearningInput,
  LlmModels,
  LlmProvider,
  QuizInput,
  QuizQuestionDraft,
  RankCandidatesInput,
  RankedCandidate,
  ReviseDocumentInput,
  SummarizeInput,
} from '#services/llm/types'

/**
 * Talks to Claude through the official Anthropic SDK. The client is injected so
 * the provider can be tested without making real network calls, and the model
 * used for each task comes from configuration.
 *
 * The provider is reader-stateless: callers pass a pre-assembled "About the
 * reader" markdown block (`readerContext`) for the tasks that need it, and it is
 * injected as the first content block of the user message.
 */
export class AnthropicProvider implements LlmProvider {
  constructor(
    private client: Anthropic,
    private models: LlmModels
  ) {}

  async rankCandidates(input: RankCandidatesInput): Promise<RankedCandidate[]> {
    const userMessage = [
      `Section: ${input.categoryTitle}`,
      '',
      'What makes an item relevant to this section:',
      input.relevanceHint,
      '',
      'Candidates:',
      JSON.stringify(input.candidates, null, 2),
    ].join('\n')

    const result = await this.completeJson<{ rankings: RankedCandidate[] }>({
      model: this.models.ranking,
      system: RANKING_SYSTEM_PROMPT,
      readerContext: input.readerContext,
      // The reader context is identical for every category in a run, so caching
      // it lets the per-category ranking calls share the prefix.
      cacheReaderContext: true,
      userMessage,
      maxTokens: 2048,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          rankings: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'integer' },
                score: { type: 'number' },
                reason: { type: 'string' },
              },
              required: ['id', 'score', 'reason'],
            },
          },
        },
        required: ['rankings'],
      },
    })

    return [...result.rankings].sort((a, b) => b.score - a.score)
  }

  async summarize(input: SummarizeInput): Promise<string> {
    const userMessage = [
      `Title: ${input.title}`,
      `Source: ${input.sourceName}`,
      '',
      'Article:',
      input.content,
    ].join('\n')

    return this.completeText({
      model: this.models.summary,
      system: SUMMARY_SYSTEM_PROMPT,
      userMessage,
      maxTokens: 400,
    })
  }

  async generateKeyLearning(input: KeyLearningInput): Promise<string> {
    const userMessage = `The reader's learning-gap topics:\n${bulletList(input.gapTopics)}`

    return this.completeText({
      model: this.models.generation,
      system: KEY_LEARNING_SYSTEM_PROMPT,
      readerContext: input.readerContext,
      userMessage,
      maxTokens: 1024,
    })
  }

  async generateQuiz(input: QuizInput): Promise<QuizQuestionDraft[]> {
    const userMessage = [
      `Write ${input.count} question${input.count === 1 ? '' : 's'}.`,
      '',
      "The reader's learning-gap topics to draw from:",
      bulletList(input.gapTopics),
    ].join('\n')

    const result = await this.completeJson<{ questions: QuizQuestionDraft[] }>({
      model: this.models.generation,
      system: QUIZ_SYSTEM_PROMPT,
      readerContext: input.readerContext,
      userMessage,
      maxTokens: 2048,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                topic: { type: 'string' },
                question: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
                correctIndex: { type: 'integer' },
                explanation: { type: 'string' },
              },
              required: ['topic', 'question', 'options', 'correctIndex', 'explanation'],
            },
          },
        },
        required: ['questions'],
      },
    })

    return result.questions
  }

  async reviseDocument(input: ReviseDocumentInput): Promise<string> {
    const userMessage = [
      'Current contents of the document:',
      input.currentContent.trim() || '(empty — nothing has been written yet)',
      '',
      'What we have recently observed about the reader:',
      input.observations,
    ].join('\n')

    return this.completeText({
      model: this.models.generation,
      system: REVISE_DOCUMENT_SYSTEM_PROMPT,
      userMessage,
      maxTokens: 1024,
    })
  }

  /**
   * Sends one request to Claude and returns the plain text of the reply. When a
   * reader context is supplied it is placed first in the user message, ahead of
   * the volatile task content, and can be marked cacheable so repeated calls
   * within a run reuse it. When a JSON schema is supplied the model is
   * constrained to that shape via structured outputs.
   */
  private async complete(params: {
    model: string
    system: string
    userMessage: string
    maxTokens: number
    readerContext?: string
    cacheReaderContext?: boolean
    schema?: Record<string, unknown>
  }): Promise<string> {
    const content: Anthropic.ContentBlockParam[] = []

    const readerContext = params.readerContext?.trim()
    if (readerContext) {
      const contextBlock: Anthropic.TextBlockParam = { type: 'text', text: readerContext }
      if (params.cacheReaderContext) {
        contextBlock.cache_control = { type: 'ephemeral' }
      }
      content.push(contextBlock)
    }

    content.push({ type: 'text', text: params.userMessage })

    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: params.maxTokens,
      system: [{ type: 'text', text: params.system }],
      messages: [{ role: 'user', content }],
      ...(params.schema
        ? { output_config: { format: { type: 'json_schema', schema: params.schema } } }
        : {}),
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()

    if (!text) {
      throw new Error('The language model returned an empty response.')
    }

    return text
  }

  private async completeText(params: {
    model: string
    system: string
    userMessage: string
    maxTokens: number
    readerContext?: string
  }): Promise<string> {
    return this.complete(params)
  }

  private async completeJson<T>(params: {
    model: string
    system: string
    userMessage: string
    maxTokens: number
    schema: Record<string, unknown>
    readerContext?: string
    cacheReaderContext?: boolean
  }): Promise<T> {
    const text = await this.complete(params)
    try {
      return JSON.parse(text) as T
    } catch {
      throw new Error('The language model returned output that was not valid JSON.')
    }
  }
}

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n')
}
