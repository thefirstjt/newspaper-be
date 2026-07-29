import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Category from '#models/category'
import Source from '#models/source'
import { setSourceDiscovery, resetSourceDiscovery } from '#services/onboarding/source_discovery'
import {
  setInterestCategorization,
  resetInterestCategorization,
} from '#services/onboarding/interest_categorization'
import {
  generateCategoriesAndSources,
  categoriesChannelFor,
  setCategoryGenerationDispatcher,
  resetCategoryGenerationDispatcher,
} from '#services/onboarding/category_generation'
import type { CategoryGenerationInput } from '#services/onboarding/category_generation'
import type { VerifiedSource } from '#services/onboarding/source_discovery'
import type { CategoryPlan } from '#services/orchestrator/interest_categorizer'

let counter = 0
async function reader() {
  counter += 1
  return User.create({
    name: 'Reader',
    email: `reader-${counter}@example.com`,
    password: 'secret123',
  })
}

/** Stubs source discovery to return the given sources for every category. */
function discoveryReturning(sources: VerifiedSource[]) {
  setSourceDiscovery(() => ({
    async discoverVerified() {
      return sources
    },
  }))
}

/** Stubs interest categorisation to return the given category plan. */
function categorizationReturning(categories: CategoryPlan[]) {
  setInterestCategorization(() => ({
    async categorize() {
      return categories
    },
  }))
}

test.group('Onboarding — categories endpoint (stage 3)', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  // Swap the real (Redis-backed) dispatcher for one that just records calls, so
  // the endpoint can be tested without a queue running.
  let dispatched: { userId: string; input: CategoryGenerationInput }[] = []
  group.each.setup(() => {
    dispatched = []
    setCategoryGenerationDispatcher(() => ({
      async dispatch(userId, input) {
        dispatched.push({ userId, input })
      },
    }))
  })
  group.teardown(() => resetCategoryGenerationDispatcher())

  test('queues generation and returns the reader’s channel', async ({ client, assert }) => {
    const user = await reader()

    const response = await client
      .post('/api/v1/onboarding/categories')
      .json({ categories: [{ title: 'AI News', description: 'How the world talks about AI.' }] })
      .loginAs(user)

    response.assertStatus(202)
    assert.equal(response.body().data.channel, categoriesChannelFor(user.id))

    // The work was handed to the queue with the reader and their input, and
    // nothing was generated inline.
    assert.lengthOf(dispatched, 1)
    assert.equal(dispatched[0].userId, user.id)
    assert.deepEqual(dispatched[0].input.categories, [
      { title: 'AI News', description: 'How the world talks about AI.' },
    ])
    assert.lengthOf(await Category.query().where('user_id', user.id), 0)
  })

  test('rejects a request with neither categories nor interests', async ({ client, assert }) => {
    const user = await reader()
    const response = await client.post('/api/v1/onboarding/categories').json({}).loginAs(user)
    response.assertStatus(422)
    assert.lengthOf(dispatched, 0)
  })

  test('requires authentication', async ({ client, assert }) => {
    const response = await client
      .post('/api/v1/onboarding/categories')
      .json({ categories: [{ title: 'X' }] })
    response.assertStatus(401)
    assert.lengthOf(dispatched, 0)
  })
})

test.group('Category generation (queued work)', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())
  group.teardown(() => {
    resetSourceDiscovery()
    resetInterestCategorization()
  })

  test('creates categories with unique slugs and their verified sources', async ({ assert }) => {
    discoveryReturning([
      {
        type: 'rss',
        name: 'Stripe Engineering',
        settings: { feedUrl: 'https://stripe.com/blog/feed.rss' },
      },
    ])
    const user = await reader()

    await generateCategoriesAndSources(user, {
      categories: [
        { title: 'AI News', description: 'How the world talks about AI.' },
        { title: 'AI News' },
      ],
    })

    const categories = await Category.query().where('user_id', user.id).orderBy('id')
    assert.deepEqual(
      categories.map((category) => category.key),
      ['ai-news', 'ai-news-2']
    )

    const sources = await Source.query().where('user_id', user.id)
    // One discovered source per category.
    assert.lengthOf(sources, 2)
    assert.equal(sources[0].type, 'rss')
    assert.deepEqual(sources[0].settings, { feedUrl: 'https://stripe.com/blog/feed.rss' })
  })

  test('creates a discovered youtube channel as a youtube source', async ({ assert }) => {
    discoveryReturning([
      {
        type: 'youtube',
        name: 'Veritasium',
        settings: {
          channelUrl: 'https://www.youtube.com/@veritasium',
          channelId: 'UCHnyfMqiRRG1u-2MsSQLbXA',
        },
      },
    ])
    const user = await reader()

    await generateCategoriesAndSources(user, { categories: [{ title: 'Science' }] })

    const sources = await Source.query().where('user_id', user.id)
    assert.lengthOf(sources, 1)
    assert.equal(sources[0].type, 'youtube')
    assert.deepEqual(sources[0].settings, {
      channelUrl: 'https://www.youtube.com/@veritasium',
      channelId: 'UCHnyfMqiRRG1u-2MsSQLbXA',
    })
  })

  test('a category whose feeds all fail verification is created with no sources', async ({
    assert,
  }) => {
    discoveryReturning([])
    const user = await reader()

    const created = await generateCategoriesAndSources(user, {
      categories: [{ title: 'Obscure Topic' }],
    })

    assert.lengthOf(created[0].sources, 0)
    assert.lengthOf(await Category.query().where('user_id', user.id), 1)
    assert.lengthOf(await Source.query().where('user_id', user.id), 0)
  })

  test('categorises free-text interests into categories with sources', async ({ assert }) => {
    categorizationReturning([
      { title: 'Engineering', description: 'Deep engineering writing.' },
      { title: 'Global AI News', description: 'How the world talks about AI.' },
    ])
    discoveryReturning([
      {
        type: 'rss',
        name: 'Stripe Engineering',
        settings: { feedUrl: 'https://stripe.com/blog/feed.rss' },
      },
    ])
    const user = await reader()

    await generateCategoriesAndSources(user, {
      interests: 'I love distributed systems and keeping up with AI in the world.',
    })

    const categories = await Category.query().where('user_id', user.id).orderBy('id')
    assert.deepEqual(
      categories.map((category) => category.title),
      ['Engineering', 'Global AI News']
    )
    // A discovered source per derived category.
    assert.lengthOf(await Source.query().where('user_id', user.id), 2)
  })
})
