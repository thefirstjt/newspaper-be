import { generateText, Output } from 'ai'
import { modelFor } from '#services/orchestrator/models'
import { rankingSchema, quizSchema, editionHeadlineSchema } from '#services/orchestrator/schemas'
import {
  buildMessageUsingContext,
  assertNotEmpty,
  bulletList,
} from '#services/orchestrator/helpers'
import {
  KEY_LEARNING_SYSTEM_PROMPT,
  QUIZ_SYSTEM_PROMPT,
  RANKING_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
  EDITION_HEADLINE_SYSTEM_PROMPT,
} from '#services/orchestrator/prompts'
import { AgentTask } from '#services/orchestrator/types'
import type {
  EditionHeadline,
  EditionHeadlineInput,
  KeyLearningInput,
  ModelResolver,
  QuizInput,
  QuizQuestionDraft,
  RankCandidatesInput,
  RankedCandidate,
  SummarizeInput,
} from '#services/orchestrator/types'

/**
 * Runs the newspaper's editorial language-model work — ranking stories,
 * summarising them, and writing the key learning and quiz — on top of the
 * Vercel AI SDK, which handles every provider. Each task resolves its own
 * model, so tasks can run on different providers (rank on OpenAI, summarise on
 * Claude, and so on).
 *
 * The resolver is injectable, which both keeps the per-task model choice in one
 * place and lets tests supply a mock model so no real network calls are made.
 */
export class HeadlineManager {
  constructor(private getModelFor: ModelResolver = modelFor) {}

  /**
   * Scores the candidate stories for one section by how well they fit the
   * reader, returning them ordered best first.
   */
  async rankCandidates(input: RankCandidatesInput): Promise<RankedCandidate[]> {
    const userMessage = [
      `Section: ${input.categoryTitle}`,
      '',
      'What makes an item relevant to this section:',
      input.relevanceHint,
      '',
      `Return at most the ${input.limit} best candidates.`,
      '',
      'Candidates:',
      JSON.stringify(input.candidates, null, 2),
    ].join('\n')

    const { output } = await generateText({
      model: this.getModelFor(AgentTask.RANKING),
      system: RANKING_SYSTEM_PROMPT,
      messages: buildMessageUsingContext(input.readerContext, userMessage, { cache: true }),
      output: Output.object({ schema: rankingSchema }),
    })

    return [...output.rankings].sort((a, b) => b.score - a.score)
  }

  /**
   * Writes the short blurb shown under a story so the reader can decide whether
   * to open it. Summaries do not depend on the reader, so no reader context is
   * sent.
   */
  async summarizeArticle(input: SummarizeInput): Promise<string> {
    const userMessage = [
      `Title: ${input.title}`,
      `Source: ${input.sourceName}`,
      '',
      'Article:',
      input.content,
    ].join('\n')

    const { text } = await generateText({
      model: this.getModelFor(AgentTask.SUMMARY),
      system: SUMMARY_SYSTEM_PROMPT,
      prompt: userMessage,
    })

    return assertNotEmpty(text)
  }

  /** Writes the one-or-two paragraph key learning of the day. */
  /**
   * Writes the edition's front-page headline and a one-paragraph summary of the
   * day from the stories it surfaced, so the reader gets a masthead when they
   * open the paper (and the email gets a real subject line).
   */
  async writeEditionHeadline(input: EditionHeadlineInput): Promise<EditionHeadline> {
    const userMessage = ["Today's stories:", '', JSON.stringify(input.stories, null, 2)].join('\n')

    const { output } = await generateText({
      model: this.getModelFor(AgentTask.GENERATION),
      system: EDITION_HEADLINE_SYSTEM_PROMPT,
      messages: buildMessageUsingContext(input.readerContext, userMessage),
      output: Output.object({ schema: editionHeadlineSchema }),
    })

    return {
      headline: assertNotEmpty(output.headline),
      summary: assertNotEmpty(output.summary),
    }
  }

  async writeKeyLearning(input: KeyLearningInput): Promise<string> {
    const userMessage = `The reader's learning-gap topics:\n${bulletList(input.gapTopics)}`

    const { text } = await generateText({
      model: this.getModelFor(AgentTask.GENERATION),
      system: KEY_LEARNING_SYSTEM_PROMPT,
      messages: buildMessageUsingContext(input.readerContext, userMessage),
    })

    return assertNotEmpty(text)
  }

  /** Writes the day's multiple-choice quiz questions. */
  async writeQuiz(input: QuizInput): Promise<QuizQuestionDraft[]> {
    const userMessage = [
      `Write ${input.count} question${input.count === 1 ? '' : 's'}.`,
      '',
      "The reader's learning-gap topics to draw from:",
      bulletList(input.gapTopics),
    ].join('\n')

    const { output } = await generateText({
      model: this.getModelFor(AgentTask.GENERATION),
      system: QUIZ_SYSTEM_PROMPT,
      messages: buildMessageUsingContext(input.readerContext, userMessage),
      output: Output.object({ schema: quizSchema }),
    })

    return output.questions
  }
}
