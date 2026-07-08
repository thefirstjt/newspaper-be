import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import newspaperConfig from '#config/newspaper'
import User from '#models/user'
import Category from '#models/category'
import Source from '#models/source'
import GapTopic from '#models/gap_topic'
import UserSetting from '#models/user_setting'
import ReaderDocument from '#models/reader_document'

const expectedSourceCount = newspaperConfig.categories.reduce(
  (total, category) => total + category.sources.length,
  0
)

async function signUp(client: ApiClient, email: string) {
  const response = await client
    .post('/api/v1/auth/signup')
    .json({ name: 'Reader', email, password: 'secret123', passwordConfirmation: 'secret123' })
  response.assertStatus(200)
  return User.findByOrFail('email', email)
}

test.group('signup seeding', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  test('a new user gets the default categories, sources, gap topics, settings, and docs', async ({
    client,
    assert,
  }) => {
    const user = await signUp(client, 'new@example.com')

    const categories = await Category.query().where('user_id', user.id)
    assert.lengthOf(categories, newspaperConfig.categories.length)

    const sources = await Source.query().where('user_id', user.id)
    assert.lengthOf(sources, expectedSourceCount)

    const gapTopics = await GapTopic.query().where('user_id', user.id)
    assert.lengthOf(gapTopics, newspaperConfig.gapTopics.length)

    const settings = await UserSetting.findBy('user_id', user.id)
    assert.isNotNull(settings)
    assert.equal(settings!.emailRecipient, 'new@example.com')

    const documents = await ReaderDocument.query().where('user_id', user.id)
    assert.lengthOf(documents, 3)
    assert.isAbove(documents[0].content.trim().length, 0)
  })

  test('two users are seeded independently', async ({ client, assert }) => {
    const alice = await signUp(client, 'alice@example.com')
    const bob = await signUp(client, 'bob@example.com')

    const aliceCategories = await Category.query().where('user_id', alice.id)
    const bobCategories = await Category.query().where('user_id', bob.id)

    assert.lengthOf(aliceCategories, newspaperConfig.categories.length)
    assert.lengthOf(bobCategories, newspaperConfig.categories.length)
    // No overlap: every category row belongs to exactly one of them.
    const allCategories = await Category.all()
    assert.lengthOf(allCategories, aliceCategories.length + bobCategories.length)
  })
})
