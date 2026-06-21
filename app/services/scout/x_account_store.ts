import XAccount from '#models/x_account'
import type { XAccountCache } from '#services/scout/types'

/**
 * The persistent cache of X handle → user id, backed by the `x_accounts` table.
 * Handles are normalised to lower case so the same account is never stored or
 * looked up twice under a different casing.
 */
export class XAccountStore implements XAccountCache {
  async lookup(username: string): Promise<string | null> {
    const account = await XAccount.findBy('username', normalize(username))
    return account?.userId ?? null
  }

  async remember(username: string, userId: string): Promise<void> {
    await XAccount.updateOrCreate({ username: normalize(username) }, { userId })
  }
}

function normalize(username: string): string {
  return username.replace(/^@/, '').trim().toLowerCase()
}
