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
import type { DiscoveredSource } from '#services/orchestrator/source_discoverer'
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
function discoveryReturning(sources: DiscoveredSource[]) {
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

test.group('Onboarding — categories (stage 3)', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())
  group.teardown(() => {
    resetSourceDiscovery()
    resetInterestCategorization()
  })

  test('creates categories with unique slugs and their verified sources', async ({
    client,
    assert,
  }) => {
    discoveryReturning([
      { name: 'Stripe Engineering', feedUrl: 'https://stripe.com/blog/feed.rss' },
    ])
    const user = await reader()

    const response = await client
      .post('/api/v1/onboarding/categories')
      .json({
        categories: [
          { title: 'AI News', description: 'How the world talks about AI.' },
          { title: 'AI News' },
        ],
      })
      .loginAs(user)
    response.assertStatus(200)

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

  test('a category whose feeds all fail verification is created with no sources', async ({
    client,
    assert,
  }) => {
    discoveryReturning([])
    const user = await reader()

    const response = await client
      .post('/api/v1/onboarding/categories')
      .json({ categories: [{ title: 'Obscure Topic' }] })
      .loginAs(user)
    response.assertStatus(200)

    assert.lengthOf(response.body().data.categories[0].sources, 0)
    assert.lengthOf(await Category.query().where('user_id', user.id), 1)
    assert.lengthOf(await Source.query().where('user_id', user.id), 0)
  })

  test('categorises free-text interests into categories with sources', async ({
    client,
    assert,
  }) => {
    categorizationReturning([
      { title: 'Engineering', description: 'Deep engineering writing.' },
      { title: 'Global AI News', description: 'How the world talks about AI.' },
    ])
    discoveryReturning([
      { name: 'Stripe Engineering', feedUrl: 'https://stripe.com/blog/feed.rss' },
    ])
    const user = await reader()

    const response = await client
      .post('/api/v1/onboarding/categories')
      .json({ interests: 'I love distributed systems and keeping up with AI in the world.' })
      .loginAs(user)
    response.assertStatus(200)

    const categories = await Category.query().where('user_id', user.id).orderBy('id')
    assert.deepEqual(
      categories.map((category) => category.title),
      ['Engineering', 'Global AI News']
    )
    // A discovered source per derived category.
    assert.lengthOf(await Source.query().where('user_id', user.id), 2)
  })

  test('rejects a request with neither categories nor interests', async ({ client }) => {
    const user = await reader()
    const response = await client.post('/api/v1/onboarding/categories').json({}).loginAs(user)
    response.assertStatus(422)
  })

  test('requires authentication', async ({ client }) => {
    const response = await client
      .post('/api/v1/onboarding/categories')
      .json({ categories: [{ title: 'X' }] })
    response.assertStatus(401)
  })
})
