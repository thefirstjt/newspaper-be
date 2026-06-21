import { DateTime } from 'luxon'
import newspaperConfig from '#config/newspaper'
import Rating from '#models/rating'
import Item from '#models/item'
import { getContextStore } from '#services/context/context_store_manager'
import { ContextRevisor } from '#services/orchestrator/context_revisor'
import type { ContextStore } from '#services/context/context_store'

/**
 * The pieces the learner needs, narrowed to the methods it uses so tests can
 * pass fakes (a real preferences document and a real model are not required).
 */
export interface PreferenceLearnerDeps {
  context: Pick<ContextStore, 'read' | 'write'>
  revisor: Pick<ContextRevisor, 'revise'>
}

/**
 * Folds the reader's recent feedback into their preferences document. It reads
 * the ratings and discards that have not yet been learned from, describes them
 * in plain language, asks the revisor to rewrite the preferences document to
 * absorb them, and then marks those signals as learned so they are never
 * applied twice.
 */
export class PreferenceLearner {
  constructor(private deps: PreferenceLearnerDeps) {}

  /** Returns how many signals were folded in (0 means there was nothing new). */
  async learn(): Promise<number> {
    const ratings = await Rating.query().whereNull('learned_at').preload('item')
    const discards = await Item.query().where('state', 'discarded').whereNull('learned_at')

    const observations = describeFeedback(ratings, discards)
    if (!observations) {
      return 0
    }

    const current = await this.deps.context.read('preferences')
    const revised = await this.deps.revisor.revise({ currentContent: current, observations })
    await this.deps.context.write('preferences', revised)

    const learnedAt = DateTime.now()
    for (const rating of ratings) {
      rating.learnedAt = learnedAt
      await rating.save()
    }
    for (const item of discards) {
      item.learnedAt = learnedAt
      await item.save()
    }

    const ratedCount = ratings.filter((rating) => rating.item !== null).length
    return ratedCount + discards.length
  }
}

/** Builds an "About the reader" set of observations from ratings and discards. */
function describeFeedback(ratings: Rating[], discards: Item[]): string {
  const lines: string[] = []

  for (const rating of ratings) {
    if (!rating.item) {
      continue
    }
    const note = rating.note ? ` — "${rating.note}"` : ''
    lines.push(
      `Rated "${rating.item.title}" (${describeSource(rating.item)}) ${rating.stars}/5${note}`
    )
  }

  for (const item of discards) {
    lines.push(`Discarded "${item.title}" (${describeSource(item)}) without reading`)
  }

  if (lines.length === 0) {
    return ''
  }

  return `Recent feedback from the reader:\n${lines.map((line) => `- ${line}`).join('\n')}`
}

function describeSource(item: Item): string {
  const source = item.sourceName ?? 'unknown source'
  return `${source}, ${categoryTitle(item.categoryKey)}`
}

function categoryTitle(key: string): string {
  return newspaperConfig.categories.find((category) => category.key === key)?.title ?? key
}

/** Builds a preference learner wired to the real services. */
export function createPreferenceLearner(): PreferenceLearner {
  return new PreferenceLearner({ context: getContextStore(), revisor: new ContextRevisor() })
}
