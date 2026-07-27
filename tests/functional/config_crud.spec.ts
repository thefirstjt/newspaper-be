import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Category from '#models/category'
import Source from '#models/source'
import UserSetting from '#models/user_setting'

let counter = 0
async function reader() {
  counter += 1
  return User.create({
    name: 'Reader',
    email: `reader-${counter}@example.com`,
    password: 'secret123',
  })
}

const CATEGORY = {
  key: 'eng-blogs',
  title: 'Engineering Blogs',
  min: 1,
  max: 2,
  poolSize: 6,
  relevanceHint: 'Deep engineering writing.',
}

test.group('Config CRUD — categories', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  test('creates, lists, updates, and deletes a category', async ({ client, assert }) => {
    const user = await reader()

    const created = await client.post('/api/v1/config/categories').json(CATEGORY).loginAs(user)
    created.assertStatus(200)
    const id = created.body().data.id
    assert.equal(created.body().data.key, 'eng-blogs')

    const list = await client.get('/api/v1/config/categories').loginAs(user)
    assert.lengthOf(list.body().data.categories, 1)

    const updated = await client
      .put(`/api/v1/config/categories/${id}`)
      .json({ title: 'Renamed' })
      .loginAs(user)
    updated.assertStatus(200)
    assert.equal(updated.body().data.title, 'Renamed')

    const deleted = await client.delete(`/api/v1/config/categories/${id}`).loginAs(user)
    deleted.assertStatus(204)
    assert.lengthOf(await Category.all(), 0)
  })

  test('rejects a duplicate category key', async ({ client }) => {
    const user = await reader()
    await client.post('/api/v1/config/categories').json(CATEGORY).loginAs(user)
    const again = await client.post('/api/v1/config/categories').json(CATEGORY).loginAs(user)
    again.assertStatus(422)
  })

  test('rejects a category whose max is below its min', async ({ client }) => {
    const user = await reader()
    const response = await client
      .post('/api/v1/config/categories')
      .json({ ...CATEGORY, min: 5, max: 2 })
      .loginAs(user)
    response.assertStatus(422)
  })

  test("one reader cannot touch another reader's category", async ({ client }) => {
    const alice = await reader()
    const created = await client.post('/api/v1/config/categories').json(CATEGORY).loginAs(alice)
    const id = created.body().data.id

    const bob = await reader()
    const response = await client
      .put(`/api/v1/config/categories/${id}`)
      .json({ title: 'Hijacked' })
      .loginAs(bob)
    response.assertStatus(404)
  })
})

test.group('Config CRUD — sources', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  async function categoryFor(user: User) {
    return Category.create({ userId: user.id, ...CATEGORY })
  }

  test('creates, updates, and deletes a source under a category', async ({ client, assert }) => {
    const user = await reader()
    const category = await categoryFor(user)

    const created = await client
      .post('/api/v1/config/sources')
      .json({
        categoryId: category.id,
        type: 'rss',
        name: 'Stripe Blog',
        settings: { feedUrl: 'https://stripe.com/blog/feed.rss' },
      })
      .loginAs(user)
    created.assertStatus(200)
    const id = created.body().data.id
    assert.equal(created.body().data.name, 'Stripe Blog')

    const updated = await client
      .put(`/api/v1/config/sources/${id}`)
      .json({ enabled: false })
      .loginAs(user)
    updated.assertStatus(200)
    assert.isFalse(updated.body().data.enabled)

    const deleted = await client.delete(`/api/v1/config/sources/${id}`).loginAs(user)
    deleted.assertStatus(204)
    assert.lengthOf(await Source.all(), 0)
  })

  test('rejects a source pointing at a category the reader does not own', async ({ client }) => {
    const alice = await reader()
    const category = await categoryFor(alice)

    const bob = await reader()
    const response = await client
      .post('/api/v1/config/sources')
      .json({
        categoryId: category.id,
        type: 'rss',
        name: 'Sneaky',
        settings: { feedUrl: 'https://example.com/feed' },
      })
      .loginAs(bob)
    response.assertStatus(422)
  })
})

test.group('Config CRUD — schedule', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  async function readerWithSchedule() {
    const user = await reader()
    await UserSetting.create({
      userId: user.id,
      quizMin: 1,
      quizMax: 3,
      runTime: '21:00',
      timezone: 'UTC',
      emailEnabled: true,
      emailFrequency: 'daily',
    })
    return user
  }

  test('updates the run time, timezone and frequency', async ({ client, assert }) => {
    const user = await readerWithSchedule()

    const response = await client
      .put('/api/v1/config/schedule')
      .json({ runTime: '09:00', timezone: 'Africa/Lagos', emailFrequency: 'weekly' })
      .loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().data.runTime, '09:00')
    assert.equal(response.body().data.timezone, 'Africa/Lagos')
    assert.equal(response.body().data.emailFrequency, 'weekly')

    const settings = await UserSetting.findByOrFail('user_id', user.id)
    assert.equal(settings.timezone, 'Africa/Lagos')
  })

  test('rejects an invalid timezone', async ({ client }) => {
    const user = await readerWithSchedule()

    const response = await client
      .put('/api/v1/config/schedule')
      .json({ timezone: 'Not/AZone' })
      .loginAs(user)

    response.assertStatus(422)
  })
})
