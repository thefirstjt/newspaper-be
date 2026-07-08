import XAccount from '#models/x_account'
import type { XAccountCache } from '#services/scout/types'

/**
 * One reader's cache of X handle → numeric id, backed by the `x_accounts` table.
 * Handles are normalised to lower case so the same account is never stored or
 * looked up twice under a different casing. Scoped to the reader, so each user
 * keeps their own cache.
 */
export class XAccountStore implements XAccountCache {
  constructor(private userId: string) {}

  async lookup(username: string): Promise<string | null> {
    const account = await XAccount.query()
      .where('user_id', this.userId)
      .where('username', normalize(username))
      .first()
    return account?.xUserId ?? null
  }

  async remember(username: string, xUserId: string): Promise<void> {
    await XAccount.updateOrCreate(
      { userId: this.userId, username: normalize(username) },
      { xUserId }
    )
  }
}

function normalize(username: string): string {
  return username.replace(/^@/, '').trim().toLowerCase()
}
