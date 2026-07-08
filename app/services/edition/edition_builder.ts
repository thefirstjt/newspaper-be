import db from '@adonisjs/lucid/services/db'
import newspaperConfig from '#config/newspaper'
import Edition from '#models/edition'
import Item from '#models/item'
import QuizQuestion from '#models/quiz_question'
import { createScout } from '#services/scout/scout'
import { SeenUrlStore } from '#services/scout/seen_url_store'
import { getContextStore } from '#services/context/context_store_manager'
import { HeadlineManager } from '#services/orchestrator/headline_manager'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Scout } from '#services/scout/scout'
import type { ContextStore } from '#services/context/context_store'
import type { RankedCandidate } from '#services/orchestrator/types'
import type { ScoutFailure, ScoutedCandidate } from '#services/scout/types'

/** Receives a line of progress as the build moves through its steps. */
export interface EditionLogger {
  info(message: string): void
}

/**
 * The pieces the builder needs, expressed as the methods it actually uses so a
 * test can pass lightweight fakes in place of the real services.
 */
export interface EditionBuilderDeps {
  scout: Pick<Scout, 'scout'>
  headlines: Pick<
    HeadlineManager,
    'rankCandidates' | 'summarizeArticle' | 'writeKeyLearning' | 'writeQuiz'
  >
  readerContext: Pick<ContextStore, 'assembleReaderContext'>
  seenUrls: Pick<SeenUrlStore, 'markSeen'>
  logger: EditionLogger
}

export interface EditionBuildResult {
  edition: Edition
  failures: ScoutFailure[]
}

/** One item worked out for the edition, before it is written to the database. */
interface PlannedItem {
  candidate: ScoutedCandidate
  summary: string | null
  relevanceScore: number
  rank: number
  state: 'surfaced' | 'reserve'
}

/**
 * Assembles the day's edition. It scouts for candidates, ranks each category
 * against what we know about the reader, keeps the best handful as that
 * category's pool, surfaces the top few, and summarises those. All of that work
 * happens in memory; only once it is done is the edition written, in a single
 * transaction, so a failure partway through leaves the previous edition intact.
 * Re-running for a day replaces that day's edition.
 */
export class EditionBuilder {
  constructor(private deps: EditionBuilderDeps) {}

  async build(date: string): Promise<EditionBuildResult> {
    const { logger } = this.deps

    logger.info('Scouting sources for candidate stories…')
    const { candidates, failures } = await this.deps.scout.scout()
    logger.info(
      `Scouted ${candidates.length} candidate(s)` +
        (failures.length > 0 ? `; ${failures.length} source(s) could not be read.` : '.')
    )

    const readerContext = await this.deps.readerContext.assembleReaderContext()
    const candidatesByCategory = groupByCategory(candidates)

    const planned: PlannedItem[] = []
    const surfaced: ScoutedCandidate[] = []

    for (const category of newspaperConfig.categories) {
      const candidatesForCategory = candidatesByCategory.get(category.key) ?? []
      if (candidatesForCategory.length === 0) {
        logger.info(`${category.title}: no candidates, skipping.`)
        continue
      }

      logger.info(
        `Ranking ${category.title} (${candidatesForCategory.length} candidate(s)) and summarising the picks…`
      )

      const ranked = await this.deps.headlines.rankCandidates({
        categoryTitle: category.title,
        relevanceHint: category.relevanceHint,
        readerContext,
        limit: category.poolSize,
        candidates: candidatesForCategory.map((candidate, index) => ({
          id: index,
          title: candidate.title,
          snippet: candidate.snippet,
          sourceName: candidate.sourceName,
        })),
      })

      const pool = dedupeById(ranked)
        .filter((entry) => candidatesForCategory[entry.id] !== undefined)
        .slice(0, category.poolSize)

      for (const [position, entry] of pool.entries()) {
        const candidate = candidatesForCategory[entry.id]
        const isSurfaced = position < category.max

        const summary = isSurfaced
          ? await this.deps.headlines.summarizeArticle({
              title: candidate.title,
              sourceName: candidate.sourceName,
              content: candidate.snippet,
            })
          : null

        if (isSurfaced) {
          surfaced.push(candidate)
        }

        planned.push({
          candidate,
          summary,
          relevanceScore: entry.score,
          rank: position + 1,
          state: isSurfaced ? 'surfaced' : 'reserve',
        })
      }

      const surfacedCount = Math.min(pool.length, category.max)
      logger.info(
        `  ${category.title}: ${surfacedCount} surfaced, ${pool.length - surfacedCount} reserve.`
      )
    }

    logger.info('Writing the key learning and quiz…')
    const keyLearning = await this.deps.headlines.writeKeyLearning({
      gapTopics: newspaperConfig.gapTopics,
      readerContext,
    })
    const quizQuestions = await this.deps.headlines.writeQuiz({
      gapTopics: newspaperConfig.gapTopics,
      count: pickQuizCount(newspaperConfig.quiz),
      readerContext,
    })

    logger.info('Saving edition…')
    const edition = await db.transaction(async (trx) => {
      const built = await this.resetEdition(date, trx)

      for (const item of planned) {
        await Item.create(
          {
            editionId: built.id,
            categoryKey: item.candidate.categoryKey,
            url: item.candidate.url,
            urlHash: item.candidate.urlHash,
            title: item.candidate.title,
            author: item.candidate.author,
            sourceName: item.candidate.sourceName,
            publishedAt: item.candidate.publishedAt,
            mediaType: item.candidate.mediaType,
            snippet: item.candidate.snippet,
            fullText: null,
            summary: item.summary,
            relevanceScore: item.relevanceScore,
            rank: item.rank,
            state: item.state,
            isUserSubmitted: false,
          },
          { client: trx }
        )
      }

      for (const question of quizQuestions) {
        await QuizQuestion.create(
          {
            editionId: built.id,
            topic: question.topic,
            question: question.question,
            options: question.options,
            correctIndex: question.correctIndex,
            explanation: question.explanation,
          },
          { client: trx }
        )
      }

      await this.deps.seenUrls.markSeen(surfaced, trx)

      built.keyLearning = keyLearning
      built.status = 'ready'
      built.useTransaction(trx)
      await built.save()

      return built
    })

    return { edition, failures }
  }

  /**
   * Returns the edition for the date ready to be filled within the given
   * transaction: a fresh one if none exists, otherwise the existing row with its
   * items cleared.
   */
  private async resetEdition(date: string, trx: TransactionClientContract): Promise<Edition> {
    const existing = await Edition.findBy('date', date, { client: trx })
    if (!existing) {
      return Edition.create({ date, status: 'building' }, { client: trx })
    }

    await Item.query({ client: trx }).where('edition_id', existing.id).delete()
    await QuizQuestion.query({ client: trx }).where('edition_id', existing.id).delete()

    existing.status = 'building'
    existing.keyLearning = null
    existing.useTransaction(trx)
    await existing.save()

    return existing
  }
}

/** Picks how many quiz questions to write, anywhere in the configured range. */
function pickQuizCount(quiz: { min: number; max: number }): number {
  const span = quiz.max - quiz.min + 1
  return quiz.min + Math.floor(Math.random() * span)
}

/** Builds an edition builder wired to the real services, logging progress. */
export function createEditionBuilder(logger: EditionLogger): EditionBuilder {
  return new EditionBuilder({
    scout: createScout(),
    headlines: new HeadlineManager(),
    readerContext: getContextStore(),
    seenUrls: new SeenUrlStore(),
    logger,
  })
}

function groupByCategory(candidates: ScoutedCandidate[]): Map<string, ScoutedCandidate[]> {
  const grouped = new Map<string, ScoutedCandidate[]>()
  for (const candidate of candidates) {
    const existing = grouped.get(candidate.categoryKey)
    if (existing) {
      existing.push(candidate)
    } else {
      grouped.set(candidate.categoryKey, [candidate])
    }
  }
  return grouped
}

/** Keeps the first (highest-ranked) entry for each id, dropping later repeats. */
function dedupeById(ranked: RankedCandidate[]): RankedCandidate[] {
  const seen = new Set<number>()
  return ranked.filter((entry) => {
    if (seen.has(entry.id)) {
      return false
    }
    seen.add(entry.id)
    return true
  })
}
