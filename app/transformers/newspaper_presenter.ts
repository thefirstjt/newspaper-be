import type Edition from '#models/edition'
import type Item from '#models/item'
import type QuizQuestion from '#models/quiz_question'
import type SubmittedLink from '#models/submitted_link'
import type Category from '#models/category'
import type Source from '#models/source'

/**
 * Turns the newspaper's models into the plain shapes the API returns. These are
 * written as functions rather than BaseTransformer classes because the edition
 * view nests items inside categories inside the edition, and the serializer only
 * resolves transformer instances at the top level — so a hand-built plain shape
 * is both simpler and predictable here.
 */

/** How a single item appears to the reader: enough to show and act on it. */
export function presentItem(item: Item) {
  return {
    id: item.id,
    categoryKey: item.categoryKey,
    title: item.title,
    url: item.url,
    summary: item.summary,
    source: item.sourceName,
    author: item.author,
    mediaType: item.mediaType,
    publishedAt: item.publishedAt?.toISO() ?? null,
    // The rating relation is only present once it has been preloaded.
    rating: item.rating ? { stars: item.rating.stars, note: item.rating.note } : null,
  }
}

/**
 * A quiz question as shown in an edition — the answer and explanation are held
 * back so they are only revealed once the reader has answered.
 */
export function presentQuizQuestion(question: QuizQuestion) {
  return {
    id: question.id,
    topic: question.topic,
    question: question.question,
    options: question.options,
  }
}

/**
 * The whole edition: its key learning, its surfaced items grouped under the
 * categories they belong to, and the day's quiz. The reader's own categories
 * (not a fixed global list) define the sections and their order; only
 * categories that have a surfaced item appear. If an item's category has since
 * been removed, it is still shown under its key so nothing is silently dropped.
 */
export function presentEdition(
  edition: Edition,
  surfacedItems: Item[],
  quizQuestions: QuizQuestion[],
  readerCategories: Category[]
) {
  const titleByKey = new Map(readerCategories.map((category) => [category.key, category.title]))

  // The reader's own category order first, then any orphaned keys still on
  // items, so a deleted category never hides its surfaced stories.
  const orderedKeys: string[] = []
  const seenKeys = new Set<string>()
  for (const key of [
    ...readerCategories.map((category) => category.key),
    ...surfacedItems.map((item) => item.categoryKey),
  ]) {
    if (seenKeys.has(key)) continue
    seenKeys.add(key)
    orderedKeys.push(key)
  }

  const categories = orderedKeys
    .map((key) => ({
      key,
      title: titleByKey.get(key) ?? key,
      items: surfacedItems
        .filter((item) => item.categoryKey === key)
        .map((item) => presentItem(item)),
    }))
    .filter((category) => category.items.length > 0)

  return {
    id: edition.id,
    date: edition.date,
    status: edition.status,
    headline: edition.headline,
    summary: edition.summary,
    keyLearning: edition.keyLearning,
    categories,
    quiz: quizQuestions.map((question) => presentQuizQuestion(question)),
  }
}

/** One of the reader's sources. */
export function presentSource(source: Source) {
  return {
    id: source.id,
    categoryId: source.categoryId,
    type: source.type,
    name: source.name,
    settings: source.settings,
    enabled: source.enabled,
    lastFetchedAt: source.lastFetchedAt?.toISO() ?? null,
  }
}

/** One of the reader's categories, with its sources (which must be preloaded). */
export function presentCategory(category: Category) {
  return {
    id: category.id,
    key: category.key,
    title: category.title,
    min: category.min,
    max: category.max,
    poolSize: category.poolSize,
    relevanceHint: category.relevanceHint,
    sources: category.sources.map((source) => presentSource(source)),
  }
}

/** A link the reader has submitted for a future edition. */
export function presentSubmittedLink(link: SubmittedLink) {
  return {
    id: link.id,
    url: link.url,
    note: link.note,
    targetDate: link.targetDate,
    source: link.source,
    status: link.status,
  }
}
