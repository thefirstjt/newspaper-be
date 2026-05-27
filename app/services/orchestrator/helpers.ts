import type { ModelMessage, TextPart } from 'ai'

/**
 * Builds a single user message that leads with the reader context, when there
 * is any, and then the volatile task content. The context block can be marked
 * cacheable so repeated calls within a run reuse it; providers without prompt
 * caching simply ignore the hint.
 */
export function buildMessageUsingContext(
  readerContext: string,
  userMessage: string,
  options: { cache?: boolean } = {}
): ModelMessage[] {
  const parts: TextPart[] = []

  const context = readerContext.trim()
  if (context) {
    parts.push({
      type: 'text',
      text: context,
      ...(options.cache
        ? { providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } } }
        : {}),
    })
  }

  parts.push({ type: 'text', text: userMessage })

  return [{ role: 'user', content: parts }]
}

/**
 * Returns the model's reply trimmed of surrounding whitespace, throwing if the
 * model produced nothing usable.
 */
export function assertNotEmpty(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('The language model returned an empty response.')
  }
  return trimmed
}

export function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n')
}
