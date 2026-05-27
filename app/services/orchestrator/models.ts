import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'
import env from '#start/env'
import newspaperConfig from '#config/newspaper'
import type { LLMProviderName, AgentTask } from '#services/orchestrator/types'

type Registry = (model: string) => LanguageModel

const registries: Partial<Record<LLMProviderName, Registry>> = {}

function registryFor(provider: LLMProviderName): Registry {
  if (!registries[provider]) {
    if (provider === 'anthropic') {
      const apiKey = env.get('ANTHROPIC_API_KEY')
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY must be set to use an Anthropic model.')
      }
      registries.anthropic = createAnthropic({ apiKey })
    } else {
      const apiKey = env.get('OPENAI_API_KEY')
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY must be set to use an OpenAI model.')
      }
      registries.openai = createOpenAI({ apiKey })
    }
  }
  return registries[provider]!
}

/**
 * Resolves the AI SDK model configured for a task. Each task names its own
 * provider and model, and the provider client is built once and reused, so a
 * provider's API key is only required if some task actually uses it.
 */
export function modelFor(task: AgentTask): LanguageModel {
  const { provider, model } = newspaperConfig.llm[task]
  return registryFor(provider)(model)
}
