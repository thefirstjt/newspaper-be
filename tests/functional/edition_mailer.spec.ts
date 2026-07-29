import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Edition from '#models/edition'
import Item from '#models/item'
import QuizQuestion from '#models/quiz_question'
import Category from '#models/category'
import { renderEditionEmail } from '#mails/edition_digest'
import { presentEdition } from '#transformers/newspaper_presenter'
import { EditionMailer } from '#services/email/edition_mailer'
import type { EmailMessage, EmailSender } from '#services/email/edition_mailer'

/** An email sender that records what it was asked to send instead of sending it. */
function recordingSender(): EmailSender & { sent: EmailMessage[] } {
  const sent: EmailMessage[] = []
  return {
    sent,
    async send(message) {
      sent.push(message)
    },
  }
}

let counter = 0
async function editionWithContent(date: string) {
  counter += 1
  const user = await User.create({
    name: 'Reader',
    email: `reader-${counter}@example.com`,
    password: 'secret123',
  })
  await Category.create({
    userId: user.id,
    key: 'eng-blogs',
    title: 'Engineering blogs',
    min: 1,
    max: 3,
    poolSize: 6,
    relevanceHint: 'Deep engineering writing.',
  })
  const edition = await Edition.create({
    userId: user.id,
    date,
    status: 'ready',
    keyLearning: 'Today you learned about quorums.',
  })
  await Item.create({
    userId: user.id,
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
    userId: user.id,
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
    userId: user.id,
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
    const sender = recordingSender()

    await new EditionMailer({
      recipient: 'reader@example.com',
      appUrl: 'https://app.example.com',
      fromAddress: 'newspaper@percussionlabs.ai',
      recipientName: 'Tomiwa',
      sender,
    }).deliver(edition)

    assert.lengthOf(sender.sent, 1)
    const message = sender.sent[0]
    assert.equal(message.to, 'reader@example.com')
    assert.equal(message.from, 'See Newspaper <newspaper@percussionlabs.ai>')
    assert.equal(message.subject, 'Fresh off the press — your stories for 21/06/2026')
    assert.include(message.html, 'A surfaced story')
    assert.include(message.html, "Hi Tomiwa, here's your news for today:")

    await edition.refresh()
    assert.equal(edition.status, 'emailed')
    assert.isNotNull(edition.emailedAt)
  })

  test('leads the subject with the edition headline when present', async ({ assert }) => {
    const edition = await editionWithContent('2026-06-21')
    edition.headline = 'Regulators draw the first global lines around frontier AI'
    await edition.save()
    const sender = recordingSender()

    await new EditionMailer({
      recipient: 'reader@example.com',
      appUrl: 'https://app.example.com',
      fromAddress: 'newspaper@percussionlabs.ai',
      recipientName: 'Tomiwa',
      sender,
    }).deliver(edition)

    assert.equal(
      sender.sent[0].subject,
      'Regulators draw the first global lines around frontier AI — your stories for 21/06/2026'
    )
  })

  test('fails clearly when no recipient is configured', async ({ assert }) => {
    const edition = await editionWithContent('2026-06-21')
    const sender = recordingSender()

    await assert.rejects(
      () =>
        new EditionMailer({
          recipient: '',
          appUrl: 'https://app.example.com',
          fromAddress: 'newspaper@percussionlabs.ai',
          recipientName: 'Tomiwa',
          sender,
        }).deliver(edition),
      /EMAIL_RECIPIENT/
    )
    assert.lengthOf(sender.sent, 0)
  })

  test('the email shows surfaced items and the app button, but not the quiz or key learning', async ({
    assert,
  }) => {
    const edition = await editionWithContent('2026-06-21')
    await edition.load('items', (items) =>
      items.where('state', 'surfaced').preload('rating').orderBy('rank')
    )
    await edition.load('quizQuestions')

    const categories = await Category.query().where('user_id', edition.userId).orderBy('id')
    const html = renderEditionEmail(
      presentEdition(edition, edition.items, edition.quizQuestions, categories),
      'https://app.example.com',
      'Tomiwa'
    )

    assert.include(html, 'A surfaced story')
    // The reader's own category name titles the section.
    assert.include(html, 'Engineering blogs')
    assert.include(html, 'Visit Newspaper')
    assert.include(html, 'href="https://app.example.com"')
    // The raw link is included as a copy-paste fallback if the button fails.
    assert.include(html, 'Copy and paste this link')
    assert.include(html, '&copy; 2026, See Newspapers by')
    assert.include(html, 'Percussion Labs')
    // The quiz and key learning are deliberately left out of the email.
    assert.notInclude(html, 'Today you learned about quorums.')
    assert.notInclude(html, 'What is a quorum?')
    // Reserves are never shown in the email.
    assert.notInclude(html, 'A reserve story')
  })
})
