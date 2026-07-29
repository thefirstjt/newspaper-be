import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Edition from '#models/edition'
import { editionMailerForUser } from '#services/email/edition_mailer'
import { editionChannelFor, makeDailyRunDispatcher } from '#services/edition/daily_run'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Lets an admin see the readers and turn their accounts on or off. A
 * deactivated reader is skipped by the daily pipeline, cannot log in, and has
 * their existing sessions revoked.
 */
export default class AdminUsersController {
  async index({ serialize }: HttpContext) {
    const users = await User.query().orderBy('created_at', 'desc')
    return serialize({ users: users.map((user) => presentUser(user)) })
  }

  /** Flips a reader's active status. Deactivating also ends their sessions. */
  async toggleStatus({ params, serialize, response }: HttpContext) {
    const user = await User.find(params.id)
    if (!user) {
      return response.notFound({ error: `There is no user with id ${params.id}.` })
    }

    user.isActive = !user.isActive
    await user.save()

    if (!user.isActive) {
      // Revoke any active tokens so a deactivated reader is logged out too.
      await db.from('auth_access_tokens').where('tokenable_id', user.id).delete()
    }

    return serialize(presentUser(user))
  }

  /** Emails the reader their most recent edition on demand. */
  async sendEdition({ params, serialize, response }: HttpContext) {
    const user = await User.find(params.id)
    if (!user) {
      return response.notFound({ error: `There is no user with id ${params.id}.` })
    }

    const edition = await Edition.query().where('user_id', user.id).orderBy('date', 'desc').first()
    if (!edition) {
      return response.notFound({ error: 'This reader has no edition to send yet.' })
    }

    try {
      await editionMailerForUser(user).deliver(edition)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return response.status(502).send({ error: `Could not send the edition: ${message}` })
    }

    await user.refresh()
    return serialize({ date: edition.date, user: presentUser(user) })
  }

  /**
   * Rebuilds a reader's edition for a day — the same work the reader's own
   * run-daily does, not a re-send of the existing one. It re-scouts, re-ranks and
   * re-summarises, replacing that day's edition. Slow work, so it is queued;
   * defaults to today, or pass a `date` (YYYY-MM-DD) to (re)build a specific day.
   */
  async rebuildEdition({ params, request, response }: HttpContext) {
    const user = await User.find(params.id)
    if (!user) {
      return response.notFound({ error: `There is no user with id ${params.id}.` })
    }

    const date = this.resolveDate(request.input('date'))
    if (!date) {
      return response.unprocessableEntity({ error: 'Provide a valid date as YYYY-MM-DD.' })
    }

    const channel = editionChannelFor(user.id)
    const outcome = await makeDailyRunDispatcher().dispatch(user.id, date)
    if (outcome === 'already-running') {
      return response.conflict({
        error: 'A build for this reader is already in progress.',
        data: { channel },
      })
    }

    return response.accepted({ data: { date, channel } })
  }

  /** Today when no date is given; a valid YYYY-MM-DD otherwise, or null. */
  private resolveDate(input: unknown): string | null {
    if (input === undefined || input === null || input === '') {
      return DateTime.now().toISODate()
    }
    if (typeof input !== 'string') {
      return null
    }
    return DateTime.fromISO(input).toISODate()
  }
}

/** How a reader appears to an admin. */
function presentUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: Boolean(user.isActive),
    lastLoggedInAt: user.lastLoggedInAt?.toISO() ?? null,
    lastEditionSentAt: user.lastEditionSentAt?.toISO() ?? null,
    createdAt: user.createdAt.toISO(),
  }
}
