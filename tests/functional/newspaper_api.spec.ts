import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Edition from '#models/edition'
import Item from '#models/item'
import Rating from '#models/rating'
import SeenUrl from '#models/seen_url'
import QuizQuestion from '#models/quiz_question'
import SubmittedLink from '#models/submitted_link'

async function reader() {
  return User.create({ fullName: 'Reader', email: 'reader@example.com', password: 'secret123' })
}

async function makeItem(
  editionId: number,
  attributes: Partial<Item> & { title: string; categoryKey: string; state: string; rank: number }
) {
  return Item.create({
    editionId,
    url: `https://example.com/${attributes.title}`,
    urlHash: `hash-${attributes.title}`,
    author: null,
    sourceName: 'Source',
    mediaType: 'article',
    snippet: `Snippet for ${attributes.title}`,
    summary: null,
    isUserSubmitted: false,
    ...attributes,
  })
}

test.group('Newspaper API', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  const today = DateTime.now().toISODate()!

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/editions/today')
    response.assertStatus(401)
  })

  test("today's edition exposes surfaced items by category, quiz without answers", async ({
    client,
    assert,
  }) => {
    const user = await reader()
    const edition = await Edition.create({
      date: today,
      status: 'ready',
      keyLearning: 'Today you learned about consistency.',
    })
    await makeItem(edition.id, {
      title: 'Surfaced',
      categoryKey: 'eng-blogs',
      state: 'surfaced',
      rank: 1,
      summary: 'A surfaced summary.',
    })
    await makeItem(edition.id, {
      title: 'Reserve',
      categoryKey: 'eng-blogs',
      state: 'reserve',
      rank: 2,
    })
    await QuizQuestion.create({
      editionId: edition.id,
      topic: 'system design',
      question: 'What is a quorum?',
      options: ['A', 'B', 'C'],
      correctIndex: 1,
      explanation: 'Because B.',
    })

    const response = await client.get('/api/v1/editions/today').loginAs(user)
    response.assertStatus(200)

    const body = response.body().data
    assert.equal(body.keyLearning, 'Today you learned about consistency.')
    assert.lengthOf(body.categories, 1)
    assert.equal(body.categories[0].key, 'eng-blogs')

    const titles = body.categories[0].items.map((item: { title: string }) => item.title)
    assert.deepEqual(titles, ['Surfaced'])

    // The quiz question is shown, but its answer and explanation are withheld.
    assert.lengthOf(body.quiz, 1)
    assert.properties(body.quiz[0], ['id', 'topic', 'question', 'options'])
    assert.notProperty(body.quiz[0], 'correctIndex')
    assert.notProperty(body.quiz[0], 'explanation')
  })

  test('a missing edition returns 404', async ({ client }) => {
    const user = await reader()
    const response = await client.get('/api/v1/editions/2020-01-01').loginAs(user)
    response.assertStatus(404)
  })

  test('rating an item records the rating, marks it seen, and sets its state', async ({
    client,
    assert,
  }) => {
    const user = await reader()
    const edition = await Edition.create({ date: today, status: 'ready' })
    const item = await makeItem(edition.id, {
      title: 'Rateable',
      categoryKey: 'eng-blogs',
      state: 'surfaced',
      rank: 1,
      summary: 'Summary.',
    })

    const response = await client
      .post(`/api/v1/items/${item.id}/rate`)
      .json({ stars: 4, note: 'Solid piece' })
      .loginAs(user)
    response.assertStatus(200)
    assert.equal(response.body().data.rating.stars, 4)

    await item.refresh()
    assert.equal(item.state, 'rated')

    const rating = await Rating.findBy('item_id', item.id)
    assert.equal(rating!.stars, 4)
    assert.isNull(rating!.learnedAt)

    const seen = await SeenUrl.findBy('url_hash', item.urlHash)
    assert.isNotNull(seen)
  })

  test('rejects a rating outside 1–5', async ({ client }) => {
    const user = await reader()
    const edition = await Edition.create({ date: today, status: 'ready' })
    const item = await makeItem(edition.id, {
      title: 'Rateable',
      categoryKey: 'eng-blogs',
      state: 'surfaced',
      rank: 1,
    })

    const response = await client
      .post(`/api/v1/items/${item.id}/rate`)
      .json({ stars: 9 })
      .loginAs(user)
    response.assertStatus(422)
  })

  test('discarding a surfaced item promotes the next reserve', async ({ client, assert }) => {
    const user = await reader()
    const edition = await Edition.create({ date: today, status: 'ready' })
    const surfaced = await makeItem(edition.id, {
      title: 'Surfaced',
      categoryKey: 'eng-blogs',
      state: 'surfaced',
      rank: 1,
      summary: 'Summary.',
    })
    const reserve = await makeItem(edition.id, {
      title: 'Reserve',
      categoryKey: 'eng-blogs',
      state: 'reserve',
      rank: 2,
      // Pre-summarised so promotion does not need the language model.
      summary: 'Reserve summary.',
    })

    const response = await client.post(`/api/v1/items/${surfaced.id}/discard`).loginAs(user)
    response.assertStatus(200)

    const body = response.body().data
    assert.equal(body.discarded.id, surfaced.id)
    assert.equal(body.promoted.id, reserve.id)

    await surfaced.refresh()
    await reserve.refresh()
    assert.equal(surfaced.state, 'discarded')
    assert.equal(reserve.state, 'surfaced')

    const seen = await SeenUrl.findBy('url_hash', reserve.urlHash)
    assert.isNotNull(seen)
  })

  test('discarding a non-surfaced item is rejected', async ({ client }) => {
    const user = await reader()
    const edition = await Edition.create({ date: today, status: 'ready' })
    const reserve = await makeItem(edition.id, {
      title: 'Reserve',
      categoryKey: 'eng-blogs',
      state: 'reserve',
      rank: 1,
    })

    const response = await client.post(`/api/v1/items/${reserve.id}/discard`).loginAs(user)
    response.assertStatus(422)
  })

  test('answering the quiz reveals the answer and feeds the running score', async ({
    client,
    assert,
  }) => {
    const user = await reader()
    const edition = await Edition.create({ date: today, status: 'ready' })
    const question = await QuizQuestion.create({
      editionId: edition.id,
      topic: 'system design',
      question: 'What is a quorum?',
      options: ['A', 'B', 'C'],
      correctIndex: 1,
      explanation: 'Because B.',
    })

    const wrong = await client
      .post(`/api/v1/quiz/${question.id}/answer`)
      .json({ selectedIndex: 0 })
      .loginAs(user)
    wrong.assertStatus(200)
    assert.isFalse(wrong.body().data.isCorrect)
    assert.equal(wrong.body().data.correctIndex, 1)
    assert.equal(wrong.body().data.explanation, 'Because B.')

    const score = await client.get('/api/v1/quiz/score').loginAs(user)
    assert.deepEqual(score.body().data, { answered: 1, correct: 0, accuracy: 0 })
  })

  test('submitting a link stores it for tomorrow by default', async ({ client, assert }) => {
    const user = await reader()

    const response = await client
      .post('/api/v1/links')
      .json({ url: 'https://example.com/read-me', note: 'Looks good' })
      .loginAs(user)
    response.assertStatus(200)

    const link = await SubmittedLink.firstOrFail()
    assert.equal(link.source, 'api')
    assert.equal(link.status, 'pending')
    assert.equal(link.targetDate, DateTime.now().plus({ days: 1 }).toISODate())
  })
})
