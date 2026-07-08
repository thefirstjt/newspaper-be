import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { EditionBuilder } from '#services/edition/edition_builder'
import type { EditionBuilderDeps } from '#services/edition/edition_builder'
import { SeenUrlStore } from '#services/scout/seen_url_store'
import User from '#models/user'
import Edition from '#models/edition'
import Item from '#models/item'
import QuizQuestion from '#models/quiz_question'
import SeenUrl from '#models/seen_url'
import type { CategoryConfig } from '#config/newspaper'
import type { QuizQuestionDraft, RankedCandidate } from '#services/orchestrator/types'
import type { ScoutResult, ScoutedCandidate } from '#services/scout/types'

let counter = 0
async function makeUser() {
  counter += 1
  return User.create({
    name: 'Reader',
    email: `reader-${counter}@example.com`,
    password: 'secret123',
  })
}

/** Two categories, each surfacing up to two of six pooled candidates. */
const CATEGORIES: CategoryConfig[] = [
  {
    key: 'eng-blogs',
    title: 'Engineering Blogs',
    min: 1,
    max: 2,
    poolSize: 6,
    relevanceHint: '',
    sources: [],
  },
  {
    key: 'global-ai-news',
    title: 'Global AI News',
    min: 1,
    max: 2,
    poolSize: 6,
    relevanceHint: '',
    sources: [],
  },
]

function candidate(categoryKey: string, title: string): ScoutedCandidate {
  return {
    categoryKey,
    url: `https://example.com/${title}`,
    urlHash: `hash-${title}`,
    title,
    snippet: `Snippet for ${title}`,
    sourceName: 'Source',
    author: null,
    publishedAt: null,
    mediaType: 'article',
  }
}

/** A scout that returns canned candidates and reports no failures. */
function scoutReturning(candidates: ScoutedCandidate[]) {
  return { scout: async (): Promise<ScoutResult> => ({ candidates, failures: [] }) }
}

/** Canned key learning and quiz so the builder has something to persist. */
const writeKeyLearning = async () => 'Today you learned about distributed systems.'
const writeQuiz = async (input: { count: number }): Promise<QuizQuestionDraft[]> =>
  Array.from({ length: input.count }, (_, index) => ({
    topic: 'system design',
    question: `Question ${index + 1}?`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    explanation: 'Because A.',
  }))

/**
 * Headlines that rank by the id given to each candidate (higher id first) so a
 * test can tell whether the builder honours the ranking order, and summarise by
 * echoing the title.
 */
const headlines = {
  rankCandidates: async (input: { candidates: { id: number }[] }): Promise<RankedCandidate[]> =>
    input.candidates
      .map((entry) => ({ id: entry.id, score: entry.id, reason: 'because' }))
      .sort((a, b) => b.score - a.score),
  summarizeArticle: async (input: { title: string }) => `Summary: ${input.title}`,
  writeKeyLearning,
  writeQuiz,
}

const emptyReaderContext = { assembleReaderContext: async () => '' }

function makeBuilder(
  userId: string,
  candidates: ScoutedCandidate[],
  headlinesDeps: EditionBuilderDeps['headlines'] = headlines
) {
  return new EditionBuilder({
    userId,
    categories: CATEGORIES,
    gapTopics: ['distributed systems'],
    quiz: { min: 1, max: 1 },
    scout: scoutReturning(candidates),
    headlines: headlinesDeps,
    readerContext: emptyReaderContext,
    seenUrls: new SeenUrlStore(userId),
    logger: { info: () => {} },
  })
}

test.group('EditionBuilder', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  const candidates = [
    candidate('eng-blogs', 'E1'),
    candidate('eng-blogs', 'E2'),
    candidate('eng-blogs', 'E3'),
    candidate('global-ai-news', 'G1'),
  ]

  test('builds a ready edition with items ranked, surfaced, and summarised', async ({ assert }) => {
    const user = await makeUser()
    const { edition } = await makeBuilder(user.id, candidates).build('2026-05-27')

    assert.equal(edition.status, 'ready')
    assert.equal(edition.date, '2026-05-27')
    assert.equal(edition.userId, user.id)

    const engItems = await Item.query()
      .where('edition_id', edition.id)
      .where('category_key', 'eng-blogs')
      .orderBy('rank')

    // eng-blogs has max 2: the two best rank first and are surfaced, the rest reserve.
    assert.deepEqual(
      engItems.map((item) => [item.title, item.state, item.rank]),
      [
        ['E3', 'surfaced', 1],
        ['E2', 'surfaced', 2],
        ['E1', 'reserve', 3],
      ]
    )

    const top = engItems[0]
    assert.equal(top.summary, 'Summary: E3')
    assert.equal(top.relevanceScore, 2)
    assert.equal(top.userId, user.id)

    const reserve = engItems[2]
    assert.isNull(reserve.summary)
  })

  test('writes the key learning and quiz onto the edition', async ({ assert }) => {
    const user = await makeUser()
    const { edition } = await makeBuilder(user.id, candidates).build('2026-05-27')

    assert.equal(edition.keyLearning, 'Today you learned about distributed systems.')

    const questions = await QuizQuestion.query().where('edition_id', edition.id)
    assert.isAtLeast(questions.length, 1)
    assert.deepEqual(questions[0].options, ['A', 'B', 'C', 'D'])
    assert.equal(questions[0].correctIndex, 0)
    assert.equal(questions[0].userId, user.id)
  })

  test('replaces the previous quiz when a day is rebuilt', async ({ assert }) => {
    const user = await makeUser()
    const builder = makeBuilder(user.id, candidates)
    await builder.build('2026-05-27')
    await builder.build('2026-05-27')

    // Every question belongs to the single rebuilt edition, none left orphaned.
    const allQuestions = await QuizQuestion.all()
    assert.lengthOf(allQuestions, 1)
  })

  test('records only the surfaced items as seen', async ({ assert }) => {
    const user = await makeUser()
    await makeBuilder(user.id, candidates).build('2026-05-27')

    const seen = await SeenUrl.all()
    assert.deepEqual(seen.map((row) => row.urlHash).sort(), ['hash-E2', 'hash-E3', 'hash-G1'])
  })

  test('rebuilds the same day without duplicating items or seen records', async ({ assert }) => {
    const user = await makeUser()
    const builder = makeBuilder(user.id, candidates)
    const first = await builder.build('2026-05-27')
    const second = await builder.build('2026-05-27')

    assert.equal(first.edition.id, second.edition.id)
    assert.lengthOf(await Item.query().where('edition_id', second.edition.id), 4)
    assert.lengthOf(await SeenUrl.all(), 3)
    assert.lengthOf(await Edition.all(), 1)
  })

  test('drops duplicate ids from the ranker so a story is never persisted twice', async ({
    assert,
  }) => {
    const user = await makeUser()
    // A ranker that returns the same id twice (id 0) plus id 1.
    const duplicatingHeadlines = {
      rankCandidates: async (): Promise<RankedCandidate[]> => [
        { id: 0, score: 0.9, reason: 'best' },
        { id: 0, score: 0.8, reason: 'again' },
        { id: 1, score: 0.5, reason: 'ok' },
      ],
      summarizeArticle: async (input: { title: string }) => `Summary: ${input.title}`,
      writeKeyLearning,
      writeQuiz,
    }
    const builder = makeBuilder(
      user.id,
      [candidate('eng-blogs', 'E1'), candidate('eng-blogs', 'E2')],
      duplicatingHeadlines
    )

    const { edition } = await builder.build('2026-05-27')
    const items = await Item.query().where('edition_id', edition.id).orderBy('rank')

    assert.deepEqual(
      items.map((item) => item.title),
      ['E1', 'E2']
    )
  })

  test('writes nothing when a step fails, leaving the previous edition intact', async ({
    assert,
  }) => {
    const user = await makeUser()
    await makeBuilder(user.id, candidates).build('2026-05-27')
    const originalItems = await Item.all()
    const originalItemCount = originalItems.length

    const failingHeadlines = {
      rankCandidates: headlines.rankCandidates,
      summarizeArticle: async () => {
        throw new Error('model is down')
      },
      writeKeyLearning,
      writeQuiz,
    }
    const failing = makeBuilder(user.id, candidates, failingHeadlines)

    await assert.rejects(() => failing.build('2026-05-27'), /model is down/)

    // The failed run touched nothing: the first edition's items are all still there.
    assert.lengthOf(await Edition.all(), 1)
    assert.lengthOf(await Item.all(), originalItemCount)
  })
})
