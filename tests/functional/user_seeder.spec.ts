import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import newspaperConfig from '#config/newspaper'
import { seedAccountBasics, seedDefaultCategories } from '#services/onboarding/user_seeder'
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

let counter = 0
async function makeUser() {
  counter += 1
  return User.create({
    name: 'Reader',
    email: `reader-${counter}@example.com`,
    password: 'secret123',
  })
}

test.group('seedAccountBasics', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  test('seeds settings and reader documents, but not categories or gap topics', async ({
    assert,
  }) => {
    const user = await makeUser()
    await db.transaction((trx) => seedAccountBasics(user, trx))

    const settings = await UserSetting.findBy('user_id', user.id)
    assert.isNotNull(settings)
    assert.equal(settings!.emailFrequency, 'daily')
    assert.equal(settings!.timezone, 'UTC')

    const documents = await ReaderDocument.query().where('user_id', user.id)
    assert.lengthOf(documents, 3)
    assert.isAbove(documents[0].content.trim().length, 0)

    // The reader defines these during onboarding, so they are not seeded here.
    assert.lengthOf(await Category.query().where('user_id', user.id), 0)
    assert.lengthOf(await GapTopic.query().where('user_id', user.id), 0)
  })
})

test.group('seedDefaultCategories', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  test('seeds the config default categories and sources', async ({ assert }) => {
    const user = await makeUser()
    await db.transaction((trx) => seedDefaultCategories(user, trx))

    assert.lengthOf(
      await Category.query().where('user_id', user.id),
      newspaperConfig.categories.length
    )
    assert.lengthOf(await Source.query().where('user_id', user.id), expectedSourceCount)
  })

  test('is idempotent — re-seeding adds nothing', async ({ assert }) => {
    const user = await makeUser()
    await db.transaction((trx) => seedDefaultCategories(user, trx))

    const result = await db.transaction((trx) => seedDefaultCategories(user, trx))
    assert.equal(result.categoriesAdded, 0)
    assert.equal(result.sourcesAdded, 0)
  })

  test('seeds two readers independently', async ({ assert }) => {
    const alice = await makeUser()
    const bob = await makeUser()
    await db.transaction((trx) => seedDefaultCategories(alice, trx))
    await db.transaction((trx) => seedDefaultCategories(bob, trx))

    const all = await Category.all()
    assert.lengthOf(all, newspaperConfig.categories.length * 2)
  })
})
