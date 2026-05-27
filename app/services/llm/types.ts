/**
 * The language-model capabilities the newspaper needs, kept provider-agnostic so
 * a concrete implementation can wire each one to Anthropic, OpenAI, or another
 * provider. The pipeline depends on this interface, never on a specific vendor.
 */

/** Which model to use for each kind of task. */
export interface LlmModels {
  /** Cheaper, faster model for ranking candidates. */
  ranking: string
  /** Cheaper, faster model for writing summaries. */
  summary: string
  /** Stronger model for the key learning, quiz, and revising reader documents. */
  generation: string
}

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

export interface LlmProvider {
  /** Score candidate items for one category by how well they fit the reader. */
  rankCandidates(input: RankCandidatesInput): Promise<RankedCandidate[]>
  /** Write a short blurb that helps the reader decide whether to open an item. */
  summarize(input: SummarizeInput): Promise<string>
  /** Write the one-or-two paragraph key learning of the day. */
  generateKeyLearning(input: KeyLearningInput): Promise<string>
  /** Write the day's multiple-choice quiz questions. */
  generateQuiz(input: QuizInput): Promise<QuizQuestionDraft[]>
  /** Rewrite a living reader document to absorb recent observations. */
  reviseDocument(input: ReviseDocumentInput): Promise<string>
}
