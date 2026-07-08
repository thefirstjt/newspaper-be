import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { ContextStore } from '#services/context/context_store'
import User from '#models/user'
import ReaderDocument from '#models/reader_document'

let counter = 0
async function makeUser() {
  counter += 1
  return User.create({
    name: 'Reader',
    email: `reader-${counter}@example.com`,
    password: 'secret123',
  })
}

test.group('ContextStore', (group) => {
  group.setup(() => testUtils.db().migrate())
  group.each.setup(() => testUtils.db().truncate())

  test('seeds a document from its template the first time it is read', async ({ assert }) => {
    const user = await makeUser()
    const store = new ContextStore(user.id)

    const content = await store.read('persona')

    assert.isAbove(content.trim().length, 0)
    // The seed was written into the reader's documents.
    const row = await ReaderDocument.query()
      .where('user_id', user.id)
      .where('key', 'persona')
      .first()
    assert.equal(row!.content, content)
  })

  test('returns the stored content once it has been written, not the template', async ({
    assert,
  }) => {
    const user = await makeUser()
    const store = new ContextStore(user.id)
    await store.write('persona', 'A custom persona for this reader.')
    assert.equal(await store.read('persona'), 'A custom persona for this reader.')
  })

  test('assembles injected documents under one "About the reader" heading', async ({ assert }) => {
    const user = await makeUser()
    const store = new ContextStore(user.id)
    const assembled = await store.assembleReaderContext()

    assert.include(assembled, '# About the reader')
    assert.include(assembled, '## Who the reader is')
    assert.include(assembled, '## What the reader likes and dislikes')
    assert.include(assembled, "## The reader's learning focus")
  })

  test('skips a document with no real content when assembling', async ({ assert }) => {
    const user = await makeUser()
    const store = new ContextStore(user.id)
    await store.write('preferences', '   \n  ')
    const assembled = await store.assembleReaderContext()

    assert.notInclude(assembled, '## What the reader likes and dislikes')
    // Other documents still appear.
    assert.include(assembled, '## Who the reader is')
  })

  test("one reader's documents are independent of another's", async ({ assert }) => {
    const aliceUser = await makeUser()
    const bobUser = await makeUser()
    const alice = new ContextStore(aliceUser.id)
    const bob = new ContextStore(bobUser.id)

    await alice.write('persona', "Alice's persona.")

    // Bob still gets the seeded template, not Alice's edit.
    const bobPersona = await bob.read('persona')
    assert.notEqual(bobPersona, "Alice's persona.")
  })
})
