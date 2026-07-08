import { DateTime } from 'luxon'
import Rating from '#models/rating'
import Item from '#models/item'
import Category from '#models/category'
import { contextStoreFor } from '#services/context/context_store_manager'
import { ContextRevisor } from '#services/orchestrator/context_revisor'
import type { ContextStore } from '#services/context/context_store'
import type User from '#models/user'

/**
 * The pieces the learner needs, narrowed to the methods it uses so tests can
 * pass fakes (a real preferences document and a real model are not required).
 * The learner works over one reader's feedback and preferences.
 */
export interface PreferenceLearnerDeps {
  userId: string
  /** Maps a category key to its title, for describing feedback in plain words. */
  categoryTitles: Map<string, string>
  context: Pick<ContextStore, 'read' | 'write'>
  revisor: Pick<ContextRevisor, 'revise'>
}

/**
 * Folds a reader's recent feedback into their preferences document. It reads the
 * ratings and discards that have not yet been learned from, describes them in
 * plain language, asks the revisor to rewrite the preferences document to absorb
 * them, and then marks those signals as learned so they are never applied twice.
 */
export class PreferenceLearner {
  constructor(private deps: PreferenceLearnerDeps) {}

  /** Returns how many signals were folded in (0 means there was nothing new). */
  async learn(): Promise<number> {
    const ratings = await Rating.query()
      .where('user_id', this.deps.userId)
      .whereNull('learned_at')
      .preload('item')
    const discards = await Item.query()
      .where('user_id', this.deps.userId)
      .where('state', 'discarded')
      .whereNull('learned_at')

    const observations = describeFeedback(ratings, discards, this.deps.categoryTitles)
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
function describeFeedback(
  ratings: Rating[],
  discards: Item[],
  categoryTitles: Map<string, string>
): string {
  const lines: string[] = []

  for (const rating of ratings) {
    if (!rating.item) {
      continue
    }
    const note = rating.note ? ` — "${rating.note}"` : ''
    lines.push(
      `Rated "${rating.item.title}" (${describeSource(rating.item, categoryTitles)}) ${rating.stars}/5${note}`
    )
  }

  for (const item of discards) {
    lines.push(
      `Discarded "${item.title}" (${describeSource(item, categoryTitles)}) without reading`
    )
  }

  if (lines.length === 0) {
    return ''
  }

  return `Recent feedback from the reader:\n${lines.map((line) => `- ${line}`).join('\n')}`
}

function describeSource(item: Item, categoryTitles: Map<string, string>): string {
  const source = item.sourceName ?? 'unknown source'
  const title = categoryTitles.get(item.categoryKey) ?? item.categoryKey
  return `${source}, ${title}`
}

/** Builds a preference learner wired to the real services for one reader. */
export async function createPreferenceLearner(user: User): Promise<PreferenceLearner> {
  const categories = await Category.query().where('user_id', user.id)
  const categoryTitles = new Map(categories.map((category) => [category.key, category.title]))

  return new PreferenceLearner({
    userId: user.id,
    categoryTitles,
    context: contextStoreFor(user.id),
    revisor: new ContextRevisor(),
  })
}
