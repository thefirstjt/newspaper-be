import app from '@adonisjs/core/services/app'
import env from '#start/env'
import { ContextStore } from '#services/context/context_store'

let store: ContextStore | undefined

/**
 * Returns the reader-context store, building it once and reusing it afterwards.
 * The live directory comes from the environment (defaulting to ./context) and
 * the templates ship under resources/context.
 */
export function getContextStore(): ContextStore {
  if (!store) {
    const liveDir = app.makePath(env.get('READER_CONTEXT_DIR', 'context'))
    const templateDir = app.makePath('resources/context')
    store = new ContextStore(liveDir, templateDir)
  }
  return store
}
