import { test } from '@japa/runner'
import ace from '@adonisjs/core/services/ace'
import app from '@adonisjs/core/services/app'
import { rm, access } from 'node:fs/promises'
import { join } from 'node:path'

// Must match READER_CONTEXT_DIR in .env.test, so the command writes here.
const contextDir = app.makePath('tmp/test-context')

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

test.group('newspaper:seed-context', (group) => {
  group.each.setup(async () => {
    await rm(contextDir, { recursive: true, force: true })
    return async () => {
      await rm(contextDir, { recursive: true, force: true })
    }
  })

  test('creates the reader-context documents from the templates', async ({ assert }) => {
    const command = await ace.exec('newspaper:seed-context', [])
    command.assertSucceeded()

    assert.isTrue(await exists(join(contextDir, 'persona.md')))
    assert.isTrue(await exists(join(contextDir, 'preferences.md')))
    assert.isTrue(await exists(join(contextDir, 'learning-focus.md')))
  })
})
