import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { PreferenceLearner } from '#services/preferences/preference_learner'
import Edition from '#models/edition'
import Item from '#models/item'
import Rating from '#models/rating'

function itemFor(editionId: number, title: string, state: string) {
  return Item.create({
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

function learnerCapturing() {
  const captured = {
    observations: '',
    written: null as { key: string; content: string } | null,
    reviseCalls: 0,
  }
  const learner = new PreferenceLearner({
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

  async function seedFeedback() {
    const edition = await Edition.create({ date: '2026-05-27', status: 'ready' })
    const rated = await itemFor(edition.id, 'Kafka deep dive', 'rated')
    await Rating.create({ itemId: rated.id, stars: 5, note: 'loved the internals' })
    await itemFor(edition.id, 'Crypto price drama', 'discarded')
  }

  test('describes ratings and discards and rewrites the preferences document', async ({
    assert,
  }) => {
    await seedFeedback()
    const { learner, captured } = learnerCapturing()

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
    await seedFeedback()
    const { learner, captured } = learnerCapturing()

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
    const { learner, captured } = learnerCapturing()

    const applied = await learner.learn()

    assert.equal(applied, 0)
    assert.equal(captured.reviseCalls, 0)
    assert.isNull(captured.written)
  })
})
