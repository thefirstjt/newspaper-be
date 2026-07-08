import newspaperConfig from '#config/newspaper'
import type Edition from '#models/edition'
import type Item from '#models/item'
import type QuizQuestion from '#models/quiz_question'
import type SubmittedLink from '#models/submitted_link'

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
 * categories they belong to, and the day's quiz. Only categories that have a
 * surfaced item appear.
 */
export function presentEdition(
  edition: Edition,
  surfacedItems: Item[],
  quizQuestions: QuizQuestion[]
) {
  const categories = newspaperConfig.categories
    .map((category) => ({
      key: category.key,
      title: category.title,
      items: surfacedItems
        .filter((item) => item.categoryKey === category.key)
        .map((item) => presentItem(item)),
    }))
    .filter((category) => category.items.length > 0)

  return {
    id: edition.id,
    date: edition.date,
    status: edition.status,
    keyLearning: edition.keyLearning,
    categories,
    quiz: quizQuestions.map((question) => presentQuizQuestion(question)),
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
