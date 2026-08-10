import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Category from '#models/category'
import Source from '#models/source'
import { generateSourcesForCategory } from '#services/sources/category_source_generation'
import type { SourceDiscovery, VerifiedSource } from '#services/onboarding/source_discovery'

let counter = 0
async function reader() {
  counter += 1
  return User.create({
    name: 'Reader',
    email: `reader-${counter}@example.com`,
    password: 'secret123',
  })
}

async function category(user: User) {
  return Category.create({
    userId: user.id,
    key: 'eng-blogs',
    title: 'Engineering Blogs',
    min: 1,
    max: 2,
    poolSize: 6,
    relevanceHint: 'Deep engineering writing.',
  })
}

/** A discovery stub that returns the given sources for any category. */
function discoveryReturning(sources: VerifiedSource[]): SourceDiscovery {
  return {
    async discoverVerified() {
      return sources
    },
  }
}

const FEED: VerifiedSource = {
  type: 'rss',
  name: 'Some Blog',
  settings: { feedUrl: 'https://blog.example.com/feed' },
}

test.group('Category source generation', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  test('saves the discovered sources onto the category', async ({ assert }) => {
    const user = await reader()
    const cat = await category(user)

    const result = await generateSourcesForCategory(user, cat, discoveryReturning([FEED]))

    const saved = await Source.query().where('category_id', cat.id)
    assert.lengthOf(saved, 1)
    assert.equal(saved[0].type, 'rss')
    assert.equal(saved[0].name, 'Some Blog')
    assert.equal(saved[0].settings.feedUrl, 'https://blog.example.com/feed')
    // The returned category carries its freshly discovered sources.
    assert.lengthOf(result.sources, 1)
  })

  test('does not duplicate a source the category already has', async ({ assert }) => {
    const user = await reader()
    const cat = await category(user)

    // First pass saves it; a second pass (as a retry would) must not add it again,
    // even though the name casing differs.
    await generateSourcesForCategory(user, cat, discoveryReturning([FEED]))
    await generateSourcesForCategory(
      user,
      cat,
      discoveryReturning([{ ...FEED, name: 'SOME BLOG' }])
    )

    const saved = await Source.query().where('category_id', cat.id)
    assert.lengthOf(saved, 1)
  })
})
