import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { PreferenceLearner } from '#services/preferences/preference_learner'
import User from '#models/user'
import Edition from '#models/edition'
import Item from '#models/item'
import Rating from '#models/rating'

let counter = 0
async function makeUser() {
  counter += 1
  return User.create({
    name: 'Reader',
    email: `reader-${counter}@example.com`,
    password: 'secret123',
  })
}

function itemFor(userId: string, editionId: number, title: string, state: string) {
  return Item.create({
    userId,
    editionId,
    categoryKey: 'eng-blogs',
    url: `https://example.com/${title}`,
    urlHash: `hash-${title}`,
    title,
    sourceName: 'Stripe',
    mediaType: 'article',
    state,
    isUserSubmitted: false,
  })
}

function learnerCapturing(userId: string) {
  const captured = {
    observations: '',
    written: null as { key: string; content: string } | null,
    reviseCalls: 0,
  }
  const learner = new PreferenceLearner({
    userId,
    categoryTitles: new Map([['eng-blogs', 'Engineering Blogs']]),
    context: {
      read: async () => 'Current preferences.',
      write: async (key, content) => {
        captured.written = { key, content }
      },
    },
    revisor: {
      revise: async ({ observations }) => {
        captured.reviseCalls += 1
        captured.observations = observations
        return 'Revised preferences.'
      },
    },
  })
  return { learner, captured }
}

test.group('PreferenceLearner', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  async function seedFeedback(userId: string) {
    const edition = await Edition.create({ userId, date: '2026-05-27', status: 'ready' })
    const rated = await itemFor(userId, edition.id, 'Kafka deep dive', 'rated')
    await Rating.create({ userId, itemId: rated.id, stars: 5, note: 'loved the internals' })
    await itemFor(userId, edition.id, 'Crypto price drama', 'discarded')
  }

  test('describes ratings and discards and rewrites the preferences document', async ({
    assert,
  }) => {
    const user = await makeUser()
    await seedFeedback(user.id)
    const { learner, captured } = learnerCapturing(user.id)

    const applied = await learner.learn()

    assert.equal(applied, 2)
    assert.include(captured.observations, 'Kafka deep dive')
    assert.include(captured.observations, '5/5')
    assert.include(captured.observations, 'loved the internals')
    assert.include(captured.observations, 'Crypto price drama')
    assert.include(captured.observations, 'Discarded')
    assert.deepEqual(captured.written, { key: 'preferences', content: 'Revised preferences.' })
  })

  test('marks folded signals as learned and does not re-apply them', async ({ assert }) => {
    const user = await makeUser()
    await seedFeedback(user.id)
    const { learner, captured } = learnerCapturing(user.id)

    await learner.learn()

    const rating = await Rating.firstOrFail()
    const discarded = await Item.findByOrFail('state', 'discarded')
    assert.isNotNull(rating.learnedAt)
    assert.isNotNull(discarded.learnedAt)

    const again = await learner.learn()
    assert.equal(again, 0)
    assert.equal(captured.reviseCalls, 1)
  })

  test('does nothing when there is no new feedback', async ({ assert }) => {
    const user = await makeUser()
    const { learner, captured } = learnerCapturing(user.id)

    const applied = await learner.learn()

    assert.equal(applied, 0)
    assert.equal(captured.reviseCalls, 0)
    assert.isNull(captured.written)
  })
})
