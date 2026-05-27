import { test } from '@japa/runner'
import { rm, readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'
import { ContextStore } from '#services/context/context_store'

const templateDir = app.makePath('resources/context')

test.group('ContextStore', (group) => {
  let liveDir: string
  let store: ContextStore

  group.each.setup(async () => {
    liveDir = await mkdtemp(join(tmpdir(), 'newspaper-context-'))
    store = new ContextStore(liveDir, templateDir)
    return async () => {
      await rm(liveDir, { recursive: true, force: true })
    }
  })

  test('seeds a document from its template the first time it is read', async ({ assert }) => {
    const content = await store.read('persona')

    assert.isAbove(content.trim().length, 0)
    // The seed was written into the live directory.
    const onDisk = await readFile(join(liveDir, 'persona.md'), 'utf-8')
    assert.equal(onDisk, content)
  })

  test('returns the live content once it has been written, not the template', async ({
    assert,
  }) => {
    await store.write('persona', 'A custom persona for this reader.')
    assert.equal(await store.read('persona'), 'A custom persona for this reader.')
  })

  test('assembles injected documents under one "About the reader" heading', async ({ assert }) => {
    const assembled = await store.assembleReaderContext()

    assert.include(assembled, '# About the reader')
    assert.include(assembled, '## Who the reader is')
    assert.include(assembled, '## What the reader likes and dislikes')
    assert.include(assembled, "## The reader's learning focus")
  })

  test('skips a document with no real content when assembling', async ({ assert }) => {
    await store.write('preferences', '   \n  ')
    const assembled = await store.assembleReaderContext()

    assert.notInclude(assembled, '## What the reader likes and dislikes')
    // Other documents still appear.
    assert.include(assembled, '## Who the reader is')
  })

  test('seed reports created versus already-present documents across runs', async ({ assert }) => {
    const first = await store.seed()
    assert.lengthOf(first.seeded, 3)
    assert.lengthOf(first.existing, 0)

    const second = await store.seed()
    assert.lengthOf(second.seeded, 0)
    assert.lengthOf(second.existing, 3)
  })

  test('fails clearly when a template is missing', async ({ assert }) => {
    const brokenStore = new ContextStore(liveDir, app.makePath('resources/does-not-exist'))
    await assert.rejects(() => brokenStore.read('persona'), /No template found/)
  })
})
