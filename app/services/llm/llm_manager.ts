import Anthropic from '@anthropic-ai/sdk'
import env from '#start/env'
import newspaperConfig from '#config/newspaper'
import { AnthropicProvider } from '#services/llm/anthropic_provider'
import type { LlmProvider } from '#services/llm/types'

let provider: LlmProvider | undefined

/**
 * Returns the configured language-model provider, building it once and reusing
 * it afterwards. The provider is chosen by `llm.provider` in the newspaper
 * config; its API key comes from the environment and its per-task models from
 * the config.
 */
export function getLlmProvider(): LlmProvider {
  if (!provider) {
    provider = buildLlmProvider()
  }
  return provider
}

function buildLlmProvider(): LlmProvider {
  const { provider: providerName, models } = newspaperConfig.llm

  if (providerName === 'anthropic') {
    const apiKey = env.get('LLM_API_KEY')
    if (!apiKey) {
      throw new Error('LLM_API_KEY must be set to use the Anthropic provider.')
    }
    return new AnthropicProvider(new Anthropic({ apiKey }), models)
  }

  throw new Error(`The "${providerName}" language-model provider is not implemented yet.`)
}
