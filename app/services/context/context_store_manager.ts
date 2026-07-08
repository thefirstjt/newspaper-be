import { ContextStore } from '#services/context/context_store'

/**
 * Returns a reader-context store scoped to one user. The store is a cheap
 * wrapper around the `reader_documents` table, so a fresh one is built per user
 * rather than shared as a singleton.
 */
export function contextStoreFor(userId: string): ContextStore {
  return new ContextStore(userId)
}
