import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import Edition from '#models/edition'
import Item from '#models/item'
import QuizQuestion from '#models/quiz_question'
import EditionDigest, { renderEditionEmail } from '#mails/edition_digest'
import { EditionMailer } from '#services/email/edition_mailer'

async function editionWithContent(date: string) {
  const edition = await Edition.create({
    date,
    status: 'ready',
    keyLearning: 'Today you learned about quorums.',
  })
  await Item.create({
    editionId: edition.id,
    categoryKey: 'eng-blogs',
    url: 'https://example.com/story',
    urlHash: 'hash-story',
    title: 'A surfaced story',
    author: null,
    sourceName: 'Stripe',
    mediaType: 'article',
    snippet: 'Snippet.',
    summary: 'A short summary of the story.',
    relevanceScore: 1,
    rank: 1,
    state: 'surfaced',
    isUserSubmitted: false,
  })
  await Item.create({
    editionId: edition.id,
    categoryKey: 'eng-blogs',
    url: 'https://example.com/reserve',
    urlHash: 'hash-reserve',
    title: 'A reserve story',
    author: null,
    sourceName: 'Stripe',
    mediaType: 'article',
    snippet: 'Snippet.',
    summary: null,
    relevanceScore: 0.5,
    rank: 2,
    state: 'reserve',
    isUserSubmitted: false,
  })
  await QuizQuestion.create({
    editionId: edition.id,
    topic: 'system design',
    question: 'What is a quorum?',
    options: ['A majority', 'A minority', 'Everyone'],
    correctIndex: 0,
    explanation: 'A majority.',
  })
  return edition
}

test.group('EditionMailer', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  test('sends the edition to the reader and marks it emailed', async ({ assert }) => {
    const edition = await editionWithContent('2026-06-21')
    const fakeMailer = mail.fake()

    try {
      await new EditionMailer('reader@example.com', 'https://app.example.com').deliver(edition)

      fakeMailer.mails.assertSent(EditionDigest, (sent) => {
        return (
          sent.message.hasTo('reader@example.com') &&
          sent.message.toObject().message.subject === 'Your newspaper for 2026-06-21'
        )
      })
    } finally {
      mail.restore()
    }

    await edition.refresh()
    assert.equal(edition.status, 'emailed')
    assert.isNotNull(edition.emailedAt)
  })

  test('fails clearly when no recipient is configured', async ({ assert }) => {
    const edition = await editionWithContent('2026-06-21')
    const fakeMailer = mail.fake()

    try {
      await assert.rejects(
        () => new EditionMailer(undefined, 'https://app.example.com').deliver(edition),
        /EMAIL_RECIPIENT/
      )
      fakeMailer.mails.assertNoneSent()
    } finally {
      mail.restore()
    }
  })

  test('the email shows surfaced items, key learning, quiz, and the app button', async ({
    assert,
  }) => {
    const edition = await editionWithContent('2026-06-21')
    await edition.load('items', (items) =>
      items.where('state', 'surfaced').preload('rating').orderBy('rank')
    )
    await edition.load('quizQuestions')

    const { presentEdition } = await import('#transformers/newspaper_presenter')
    const html = renderEditionEmail(
      presentEdition(edition, edition.items, edition.quizQuestions),
      'https://app.example.com'
    )

    assert.include(html, 'A surfaced story')
    assert.include(html, 'Today you learned about quorums.')
    assert.include(html, 'What is a quorum?')
    assert.include(html, 'href="https://app.example.com"')
    // Reserves are never shown in the email.
    assert.notInclude(html, 'A reserve story')
  })
})
