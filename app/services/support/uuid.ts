import { v7 as uuidv7 } from 'uuid'

/**
 * Generates a new UUID v7 — a time-ordered id, so rows sort roughly by
 * creation and stay index-friendly. Used for user ids across the system. Kept
 * behind one helper so the source of ids lives in a single place.
 */
export function newId(): string {
  return uuidv7()
}
