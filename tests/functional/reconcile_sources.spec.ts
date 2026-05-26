import { test } from '@japa/runner'
import ace from '@adonisjs/core/services/ace'
import testUtils from '@adonisjs/core/services/test_utils'
import newspaperConfig from '#config/newspaper'
import Source from '#models/source'

const configuredSourceCount = newspaperConfig.categories.reduce(
  (total, category) => total + category.sources.length,
  0
)

test.group('newspaper:reconcile-sources', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  test('creates a source row for every configured source', async ({ assert }) => {
    const command = await ace.exec('newspaper:reconcile-sources', [])
    command.assertSucceeded()

    const sources = await Source.all()
    assert.lengthOf(sources, configuredSourceCount)
  })

  test('parses each source settings back into an object', async ({ assert }) => {
    await ace.exec('newspaper:reconcile-sources', [])

    const stripe = await Source.findByOrFail('name', 'Stripe Engineering Blog')
    assert.equal(stripe.type, 'rss')
    assert.equal(stripe.settings.feedUrl, 'https://stripe.com/blog/feed.rss')
  })

  test('removes sources that are no longer in the config', async ({ assert }) => {
    await Source.create({
      categoryKey: 'eng-blogs',
      name: 'A retired source',
      type: 'rss',
      settings: { feedUrl: 'https://example.com/old.rss' },
      enabled: true,
    })

    const command = await ace.exec('newspaper:reconcile-sources', [])
    command.assertSucceeded()

    const retired = await Source.findBy('name', 'A retired source')
    assert.isNull(retired)
    assert.lengthOf(await Source.all(), configuredSourceCount)
  })

  test('runs without duplicating rows when invoked twice', async ({ assert }) => {
    await ace.exec('newspaper:reconcile-sources', [])
    await ace.exec('newspaper:reconcile-sources', [])

    assert.lengthOf(await Source.all(), configuredSourceCount)
  })
})
