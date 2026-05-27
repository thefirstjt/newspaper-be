/**
 * The input and output shapes for the language-model work in HeadlineManager,
 * plus the small config types that decide which model runs each task. Provider
 * differences are handled by the Vercel AI SDK, so these describe only the
 * newspaper's own data.
 */

export type LLMProviderName = 'anthropic' | 'openai'

/** The distinct kinds of work the newspaper asks a model to do. */
export enum AgentTask {
  RANKING = 'ranking',
  SUMMARY = 'summary',
  GENERATION = 'generation',
}

/**
 * Which provider and model handle a single task. Each task is configured
 * independently, so (for example) ranking can run on OpenAI while summaries run
 * on Claude.
 */
export interface TaskModelConfig {
  provider: LLMProviderName
  model: string
}

export type LLMConfig = Record<AgentTask, TaskModelConfig>

/**
 * Resolves the AI SDK model to use for a task. Injected into the manager and
 * revisor so tests can supply a mock model in place of a real provider.
 */
export type ModelResolver = (task: AgentTask) => import('ai').LanguageModel

export interface RankCandidate {
  /** A caller-supplied identifier echoed back in the ranking (e.g. the item id). */
  id: number
  title: string
  snippet: string
  sourceName: string
}

export interface RankCandidatesInput {
  categoryTitle: string
  relevanceHint: string
  /** The assembled "About the reader" markdown block (see ContextStore). */
  readerContext: string
  candidates: RankCandidate[]
  /** How many of the best candidates to return, ranked. */
  limit: number
}

export interface RankedCandidate {
  id: number
  /** How well the candidate fits, from 0 (poor) to 1 (excellent). */
  score: number
  /** A short reason for the score, useful for understanding the ranking. */
  reason: string
}

export interface SummarizeInput {
  title: string
  sourceName: string
  /** The full article text to condense. */
  content: string
}

export interface KeyLearningInput {
  /** The reader's learning-gap topics to draw from. */
  gapTopics: string[]
  /** The assembled "About the reader" markdown block (see ContextStore). */
  readerContext: string
}

export interface QuizInput {
  gapTopics: string[]
  /** How many questions to produce. */
  count: number
  /** The assembled "About the reader" markdown block (see ContextStore). */
  readerContext: string
}

export interface QuizQuestionDraft {
  topic: string
  question: string
  options: string[]
  /** Index into `options` of the correct answer. */
  correctIndex: number
  explanation: string
}

export interface ReviseDocumentInput {
  /** The document's current contents (may be empty). */
  currentContent: string
  /** A plain-language description of what we have recently observed about the reader. */
  observations: string
}
